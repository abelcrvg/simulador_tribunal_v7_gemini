# Diagnóstico de Persistência de Mensagens - Simulador de Tribunal

## 1. Causa Provável da Perda de Mensagens
A perda de mensagens parece ser causada por uma combinação de **concorrência em estado in-memory** e **falhas não tratadas em cadeias de prompts da IA**. Como o banco de dados é um arquivo JSON único manipulado via objeto global em memória, requisições simultâneas (ou falhas em sub-prompts de follow-up) podem resultar em mensagens que foram "geradas" pela IA, mas nunca persistidas no disco ou perdidas durante a sincronização do `saveQueue`.

## 2. Evidências Encontradas no Código
- **`server/db.ts`**: Uso de `saveQueue` para serializar a escrita em disco, mas a leitura (`dbStore`) acessa o objeto em memória sem travas, permitindo que estados inconsistentes sejam lidos/escritos se houver concorrência.
- **`server/routers.ts`**: Cadeias complexas de `await db.createMessage` dentro de loops e condicionais de follow-up (linhas 1900-2160). Qualquer exceção em um prompt intermediário interrompe a persistência de mensagens subsequentes.
- **`client/src/pages/Trial.tsx`**: Múltiplos `refetchMessages()` com `setTimeout` indicam uma tentativa de contornar a latência de persistência do servidor, sugerindo que o frontend às vezes tenta ler antes do `saveQueue` ter finalizado a escrita no arquivo.

## 3. Arquivos e Funções Envolvidos
- **`server/db.ts`**: `loadStore()`, `persist()`, `dbStore()`, `insertOne()`, `createMessage()`, `getSessionMessages()`.
- **`server/routers.ts`**: `appRouter.message.send`, `appRouter.message.continuar`.
- **`client/src/pages/Trial.tsx`**: `refetchMessages`, `continuarJulgamento`.

## 4. Fluxo Completo de Persistência
`Router (send/continuar)` $\rightarrow$ `db.createMessage()` $\rightarrow$ `db.insertOne()` $\rightarrow$ `db.persist()` $\rightarrow$ `saveQueue.then(...)` $\rightarrow$ `writeFile(tmp)` $\rightarrow$ `rename(tmp, DB_PATH)`.

## 5. Análise de `dbStore()`
A função `dbStore()` apenas retorna a referência ao objeto `store` em memória. Ela não garante que o dado retornado seja o que está no disco naquele exato momento, nem provê isolamento de transação. Se `persist()` estiver em andamento na fila, `dbStore()` retorna o estado "sujo" (não persistido).

## 6. Análise de `persist()`
Utiliza um padrão de fila (`saveQueue = saveQueue.then(...)`). Isso evita que múltiplos `writeFile` ocorram simultaneamente (o que corromperia o arquivo), mas cria um gap temporal entre a modificação do objeto em memória e a gravação real no disco.

## 7. Análise de `insertOne()`
`insertOne` adiciona o registro ao array do `store` e chama `await persist()`. O `await` aqui aguarda a conclusão da fila de gravação, o que deveria garantir a persistência antes do retorno da função.

## 8. Análise de `createMessage()`
É um wrapper simples para `insertOne("messages", ...)`. Adiciona o timestamp `createdAt`.

## 9. Análise de `getSessionMessages()`
Filtra as mensagens por `sessionId` e as ordena ascendentemente por `createdAt`. Não há limites (`LIMIT`), paginação ou filtros de status, o que significa que todas as mensagens da sessão são carregadas.

## 10. Análise do `saveQueue`
O `saveQueue` é a única barreira contra a corrupção do arquivo JSON. No entanto, ele é volátil. Se o servidor cair enquanto a fila tem promessas pendentes, as mensagens adicionadas ao `store` em memória, mas não processadas pela fila, são perdidas para sempre.

## 11. Possíveis Race Conditions
- **Double-Submit**: Duas chamadas de `continuar` podem ler o mesmo histórico, gerar duas respostas diferentes, e tentar salvar ambas. A segunda escrita no JSON sobrescreverá a primeira se houver qualquer erro de sincronia no `store`.
- **Refetch Race**: O frontend dispara `refetchMessages` enquanto o `saveQueue` ainda está processando a escrita do `rename`.

## 12. Mensagens Salvas mas não Exibidas
Possível se o `refetch` do frontend ocorrer antes da conclusão do `saveQueue` no servidor, ou se houver um erro de ordenação por `createdAt` (embora o `sortAsc` pareça correto).

## 13. Mensagens Exibidas mas não Persistidas
Ocorre se o servidor retornar a resposta da IA para o frontend, mas o processo for encerrado ou falhar antes que o `saveQueue` completasse a escrita no arquivo `.json`.

## 14. Problemas relacionados a `sessionId`
Não foram encontrados problemas de colisão de `sessionId`, pois são IDs numéricos incrementais via `nextId`.

## 15. Problemas relacionados a `trialId`
O `trialId` é usado apenas para contexto e busca de evidências/documentos; não afeta a persistência de mensagens.

## 16. `parentSessionId` e Recursos
No fluxo de recursos (`appeal`), uma nova sessão é criada. O histórico da sessão original é lido, mas as novas mensagens são salvas na `newSessionId`. Não há risco de perda aqui, a menos que a sessão pai seja deletada.

## 17. Problemas específicos de `message.send`
A cadeia de "Objeção" $\rightarrow$ "Resposta do Juiz" $\rightarrow$ "Follow-up" envolve múltiplas chamadas a `db.createMessage`. Se a resposta do Juiz for salva, mas o follow-up falhar, a conversa fica truncada.

## 18. Problemas específicos de `message.continuar`
O Diretor de Audiência decide a ação. Se o Diretor decidir que o usuário deve falar, a função retorna `content: null`. Se a IA gerar uma fala e houver um erro na validação de "múltiplos personagens" ou "impersonificação do usuário", a mensagem é bloqueada (`throw new Error`) e não é salva.

## 19. Mensagens Simultâneas
Se duas mensagens forem geradas simultaneamente, ambas entrarão no array `store.messages`. O `saveQueue` as gravará sequencialmente. O problema é lógico: a segunda mensagem pode ter sido gerada sem "saber" da primeira.

## 20. Encerramento do Servidor durante Gravação
Qualquer mensagem que esteja no `saveQueue` mas ainda não tenha passado pelo `rename(tmp, DB_PATH)` será perdida.

## 21. Exceção após Geração de Resposta
Se `invokeLLM` retornar a resposta, mas ocorrer uma exceção antes de `db.createMessage` (ex: erro de validação ou crash do processo), a resposta é perdida pois ela existe apenas na variável local da função.

## 22. Mensagens Duplicadas
Existe uma proteção contra duplicatas em `message.continuar` (linhas 2522-2531), mas ela depende da última mensagem do banco. Se houver concorrência, a proteção pode falhar.

## 23. Sobrescrita de Mensagens
Como as mensagens são adicionadas a um array (`push`), elas não são sobrescritas individualmente. No entanto, o arquivo JSON inteiro é sobrescrito a cada `persist()`.

## 24. Corrupção do JSON
O uso de um arquivo `.tmp` seguido de `rename` (operação atômica no sistema de arquivos) minimiza drasticamente o risco de corrupção do arquivo principal.

## 25. Menor Correção Segura Recomendada
1. **Encapsular a cadeia de persistência da IA** em blocos `try/catch` granulares, garantindo que a mensagem principal seja salva mesmo que os follow-ups falhem.
2. **Implementar um mecanismo de "Ack"** ou garantir que o `await persist()` seja rigorosamente respeitado antes de qualquer retorno ao cliente.
3. **Adicionar logs de erro** específicos em cada chamada de `db.createMessage` para rastrear onde a cadeia é interrompida.

## 26. Como Testar a Correção
1. **Teste de Estresse**: Disparar múltiplas requisições de `continuar` rapidamente e verificar se todas as mensagens aparecem no JSON.
2. **Simulação de Crash**: Forçar o encerramento do servidor (`kill -9`) imediatamente após enviar uma mensagem e verificar se ela foi persistida.
3. **Teste de Exceção**: Provocar um erro na validação de personagens da IA e verificar se a mensagem anterior à falha foi mantida.
