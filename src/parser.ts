import { Token, TokenType } from './tokenizer';
import {
    NodeTypes,
    Program,
    Statement,
    Expression,
    BinaryExpression,
    Identifier,
    NumberLiteral,
} from './abstract-binary-tree';

type TokenSplitResult = {
    left: Token[];
    operator: Token;
    right: Token[];
};

export default class Parser {
    splitTokens = (
        tokens: Token[],
        delimiter: TokenType,
        length?: number
    ): Token[][] => {
        const chunks: Token[][] = [];
        let current: Token[] = [];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (length && chunks.length === length - 1) {
                current.push(...tokens.slice(i));
                break;
            }

            if (token.type === delimiter) {
                chunks.push(current);
                current = [];
            } else {
                current.push(token);
            }
        }

        if (current.length > 0) {
            chunks.push(current);
        }

        return chunks;
    };

    splitByTopLevelOperator = (
        tokens: Token[],
        operatorTypes: TokenType[]
    ): TokenSplitResult | null => {
        let depth = 0;

        for (let i = tokens.length - 1; i >= 0; i--) {
            const token = tokens[i];

            if (token.type === TokenType.LParen) {
                depth++;
            } else if (token.type === TokenType.RParen) {
                depth--;
            }

            if (depth === 0 && operatorTypes.includes(token.type)) {
                return {
                    left: tokens.slice(0, i),
                    operator: token,
                    right: tokens.slice(i + 1),
                };
            }
        }

        return null;
    };

    parseProgram = (tokens: Token[]): Program => {
        const statements = this.splitTokens(tokens, TokenType.Semicolon).map(
            (chunk: Token[]) => this.parseStatement(chunk)
        );

        return { type: NodeTypes.Program, body: statements };
    };

    parseStatement = (tokens: Token[]): Statement => {
        const type = tokens[0].type;

        switch (type) {
            case TokenType.Let:
                return {
                    type: NodeTypes.LetStatement,
                    name: this.parseIdentifier(tokens[1]),
                    value: this.parseExpression(
                        this.splitTokens(tokens, TokenType.Equal, 2)[1]
                    ),
                };
            case TokenType.Print:
                return {
                    type: NodeTypes.PrintStatement,
                    value: this.parseExpression(tokens.slice(1)),
                };
        }

        throw new Error(`Invalid statement: ${JSON.stringify(tokens)}`);
    };

    parseIdentifier = (token: Token): Identifier => {
        return { type: NodeTypes.Identifier, name: token.value };
    };

    parseNumberLiteral = (token: Token): NumberLiteral => {
        return {
            type: NodeTypes.NumberLiteral,
            value: Number(token.value),
        };
    };

    parseBinaryExpression = (tokens: Token[]): BinaryExpression => {
        const precedenceLevels: TokenType[][] = [
            [TokenType.Plus, TokenType.Minus],
            [TokenType.Mul, TokenType.Div],
        ];

        for (const operators of precedenceLevels) {
            const splitResult = this.splitByTopLevelOperator(tokens, operators);
            if (splitResult) {
                return {
                    type: NodeTypes.BinaryExpression,
                    operator: splitResult.operator.type,
                    left: this.parseExpression(splitResult.left),
                    right: this.parseExpression(splitResult.right),
                };
            }
        }

        throw new Error(`Invalid binary expression: ${JSON.stringify(tokens)}`);
    };

    isFullyParenthesized(tokens: Token[]): boolean {
        if (
            tokens[0]?.type !== TokenType.LParen ||
            tokens.at(-1)?.type !== TokenType.RParen
        ) {
            return false;
        }

        let depth = 0;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === TokenType.LParen) depth++;
            if (token.type === TokenType.RParen) depth--;

            if (depth === 0 && i < tokens.length - 1) {
                return false; // a closing paren before the final token
            }
        }

        return depth === 0;
    }

    parseExpression = (tokens: Token[]): Expression => {
        if (tokens.length === 1) {
            const token = tokens[0];
            if (token.type === TokenType.Number) {
                return this.parseNumberLiteral(token);
            } else if (token.type === TokenType.Ident) {
                return this.parseIdentifier(token);
            }
        }

        if (this.isFullyParenthesized(tokens)) {
            return this.parseExpression(tokens.slice(1, -1));
        }

        const hasOperator = tokens.find((token) =>
            [
                TokenType.Plus,
                TokenType.Minus,
                TokenType.Mul,
                TokenType.Div,
            ].includes(token.type)
        );

        if (hasOperator) {
            return this.parseBinaryExpression(tokens);
        }

        throw new Error(`Invalid expression: ${JSON.stringify(tokens)}`);
    };
}
