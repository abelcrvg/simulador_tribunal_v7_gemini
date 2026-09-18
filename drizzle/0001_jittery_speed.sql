CREATE TABLE `appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`tipo` enum('apelacao','agravo','embargos') NOT NULL,
	`recorrente` varchar(100) NOT NULL,
	`razoes` text NOT NULL,
	`status` enum('pendente','julgado') NOT NULL DEFAULT 'pendente',
	`decisao` enum('manter','reformar','anular'),
	`ementa` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`judgedAt` timestamp,
	CONSTRAINT `appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appellateJudges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appealId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cargo` varchar(100) NOT NULL,
	`voto` enum('manter','reformar','anular') NOT NULL,
	`fundamentacao` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appellateJudges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaignProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`campaignId` int NOT NULL,
	`currentCase` int NOT NULL DEFAULT 1,
	`completedCases` int NOT NULL DEFAULT 0,
	`decisions` text,
	`status` enum('em_andamento','concluido','abandonado') NOT NULL DEFAULT 'em_andamento',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `campaignProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`difficulty` enum('facil','medio','dificil','expert') NOT NULL DEFAULT 'medio',
	`totalCases` int NOT NULL,
	`storyline` text NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customTrials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trialId` int NOT NULL,
	`originalPrompt` text NOT NULL,
	`isPublic` boolean NOT NULL DEFAULT false,
	`timesPlayed` int NOT NULL DEFAULT 0,
	`rating` int DEFAULT 0,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customTrials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`content` text NOT NULL,
	`issueDate` timestamp,
	`issuer` varchar(255),
	`relevance` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hearings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`date` varchar(50) NOT NULL,
	`summary` text NOT NULL,
	`intermediateDecisions` text,
	`wasPostponed` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`postponementReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hearings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `juryVotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`jurorName` varchar(255) NOT NULL,
	`vote` varchar(50) NOT NULL,
	`opinion` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `juryVotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` varchar(50) NOT NULL,
	`content` text NOT NULL,
	`audioUrl` varchar(500),
	`isAI` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`isUser` boolean NOT NULL DEFAULT false,
	`description` text,
	`personality` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policeReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`personName` varchar(255) NOT NULL,
	`personRole` varchar(100) NOT NULL,
	`statement` text NOT NULL,
	`date` varchar(50) NOT NULL,
	`contradictions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policeReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roomPlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(255) NOT NULL,
	`selectedRole` enum('juiz','advogado_defesa','defensor_publico','promotor','assistente_acusacao','reu','vitima','testemunha','perito','jurado','desembargador','ministro','procurador_justica','subprocurador_geral'),
	`isReady` boolean NOT NULL DEFAULT false,
	`isOnline` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roomPlayers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`hostUserId` int NOT NULL,
	`trialId` int,
	`sessionId` int,
	`status` enum('aguardando','em_andamento','concluido') NOT NULL DEFAULT 'aguardando',
	`maxPlayers` int NOT NULL DEFAULT 7,
	`isPublic` boolean NOT NULL DEFAULT false,
	`theme` enum('tribunal_moderno','tribunal_classico','tribunal_supremo') NOT NULL DEFAULT 'tribunal_moderno',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`finishedAt` timestamp,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trialId` int NOT NULL,
	`userRole` enum('juiz','advogado_defesa','defensor_publico','promotor','assistente_acusacao','reu','vitima','testemunha','perito','jurado','desembargador','ministro','procurador_justica','subprocurador_geral') NOT NULL,
	`status` enum('em_andamento','concluido','abandonado') NOT NULL DEFAULT 'em_andamento',
	`verdict` text,
	`decisionDetails` text,
	`isMultiplayer` boolean NOT NULL DEFAULT false,
	`roomId` int,
	`juriVotou` boolean NOT NULL DEFAULT false,
	`instancia` enum('primeira','segunda','terceira') NOT NULL DEFAULT 'primeira',
	`parentSessionId` int,
	`appealId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trialEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`impact` text,
	`triggeredAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`isResolved` boolean NOT NULL DEFAULT false,
	CONSTRAINT `trialEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`area` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`facts` text NOT NULL,
	`legalBasis` text NOT NULL,
	`jurisprudence` text,
	`admiteJuri` boolean NOT NULL DEFAULT false,
	`timeline` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicleHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`eventDate` timestamp NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`location` varchar(255),
	`description` text NOT NULL,
	`parts` text,
	`mileage` int,
	`cost` varchar(50),
	`technician` varchar(255),
	`documents` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicleHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visualDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trialId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`category` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileUrl` text NOT NULL,
	`thumbnailUrl` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visualDocuments_id` PRIMARY KEY(`id`)
);
