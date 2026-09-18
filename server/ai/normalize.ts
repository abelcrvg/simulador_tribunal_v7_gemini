import type {
  Message,
  MessageContent,
  OutputSchema,
  ResponseFormat,
  Tool,
  ToolChoice,
} from "../_core/llm";

const ensureArray = (value: MessageContent | MessageContent[]): MessageContent[] =>
  Array.isArray(value) ? value : [value];

export function normalizeMessageForProvider(message: Message) {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content);
  const normalized = contentParts.map(part => {
    if (typeof part === "string") return { type: "text", text: part } as const;
    return part;
  });

  if (normalized.length === 1 && normalized[0].type === "text") {
    return { role, name, content: normalized[0].text };
  }

  return { role, name, content: normalized };
}

export function normalizeToolChoiceForProvider(
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined,
): "none" | "auto" | { type: "function"; function: { name: string } } | undefined {
  if (!toolChoice) return undefined;
  if (toolChoice === "none" || toolChoice === "auto") return toolChoice;
  if (toolChoice === "required") {
    if (!tools?.length) throw new Error("tool_choice 'required' was provided but no tools were configured");
    if (tools.length > 1) throw new Error("tool_choice 'required' needs a single tool or an explicit tool name");
    return { type: "function", function: { name: tools[0].function.name } };
  }
  if ("name" in toolChoice) return { type: "function", function: { name: toolChoice.name } };
  return toolChoice;
}

export function normalizeResponseFormatForProvider({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): ResponseFormat | undefined {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;
  if (!schema.name || !schema.schema) throw new Error("outputSchema requires both name and schema");

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
}
