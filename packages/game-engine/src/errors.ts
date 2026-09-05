export class GameRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}

export class GameInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameInvariantError";
  }
}
