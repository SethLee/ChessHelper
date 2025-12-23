// ChessGame - 棋子定义和管理

// 棋子类型常量
const PieceType = {
    KING: 'king',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn',
    ADVISOR: 'advisor',
    CANNON: 'cannon'
};

// 棋子颜色常量
const Color = {
    RED: 'red',
    BLACK: 'black'
};

// 中国象棋棋子符号
const PieceSymbols = {
    [Color.RED]: {
        [PieceType.ROOK]: '车'  // 红方只有车
    },
    [Color.BLACK]: {
        [PieceType.KING]: '将',
        [PieceType.ROOK]: '车',
        [PieceType.BISHOP]: '象',
        [PieceType.KNIGHT]: '马',
        [PieceType.PAWN]: '卒',
        [PieceType.ADVISOR]: '士',
        [PieceType.CANNON]: '炮'
    }
};

// 棋子类
class ChessPiece {
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.position = position;
        this.hasMoved = false; // 用于车王易位和兵的首次移动
    }

    getSymbol() {
        return PieceSymbols[this.color][this.type];
    }

    // 获取可能的移动位置（不考虑将军等复杂规则）
    getPossibleMoves(board) {
        const moves = [];
        const [row, col] = this.position;

        switch (this.type) {
            case PieceType.PAWN:
                moves.push(...this.getPawnMoves(board, row, col));
                break;
            case PieceType.ROOK:
                moves.push(...this.getRookMoves(board, row, col));
                break;
            case PieceType.BISHOP:
                moves.push(...this.getBishopMoves(board, row, col));
                break;
            case PieceType.KNIGHT:
                moves.push(...this.getKnightMoves(board, row, col));
                break;

            case PieceType.KING:
                moves.push(...this.getKingMoves(board, row, col));
                break;
            case PieceType.ADVISOR:
                moves.push(...this.getAdvisorMoves(board, row, col));
                break;
            case PieceType.CANNON:
                moves.push(...this.getCannonMoves(board, row, col));
                break;
            default:
                console.warn(`未知棋子类型: ${this.type}`);
                break;
        }

        return moves.filter(move => this.isValidPosition(move[0], move[1]));
    }

    // 兵/卒的移动规则
    getPawnMoves(board, row, col) {
        const moves = [];
        
        // 卒（红兵和黑卒）统一规则：横竖移动一格
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]  // 上下左右
        ];

        for (const [drow, dcol] of directions) {
            const newRow = row + drow;
            const newCol = col + dcol;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    // 车的移动规则 - 红车显示完整路径，可以吃掉黑子
    getRookMoves(board, row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [drow, dcol] of directions) {
            for (let i = 1; i < 9; i++) { // 修改为9以适应9行棋盘
                const newRow = row + drow * i;
                const newCol = col + dcol * i;

                if (!this.isValidPosition(newRow, newCol)) break;

                const targetPiece = board[newRow][newCol];
                if (!targetPiece) {
                    // 空位可以移动
                    moves.push([newRow, newCol]);
                } else {
                    // 遇到棋子，只能吃敌方棋子
                    if (targetPiece.color !== this.color) {
                        moves.push([newRow, newCol]);
                    }
                    break; // 遇到棋子后停止该方向移动
                }
            }
        }

        return moves;
    }

    // 象的移动规则 - 只能移动2行2列的斜向
    getBishopMoves(board, row, col) {
        const moves = [];
        const directions = [[2, 2], [2, -2], [-2, 2], [-2, -2]]; // 固定移动2格

        for (const [drow, dcol] of directions) {
            const newRow = row + drow;
            const newCol = col + dcol;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    // 马的移动规则 - 先直线移动一格，再对角线移动一格，不能穿越障碍
    getKnightMoves(board, row, col) {
        const moves = [];
        
        // 定义马的移动路径：[第一步方向, 第二步方向, 最终位置]
        const horseMoves = [
            // 先向上移动一格，再对角线
            { first: [-1, 0], diagonal: [-1, -1], final: [-2, -1] },
            { first: [-1, 0], diagonal: [-1, 1], final: [-2, 1] },
            // 先向下移动一格，再对角线
            { first: [1, 0], diagonal: [1, -1], final: [2, -1] },
            { first: [1, 0], diagonal: [1, 1], final: [2, 1] },
            // 先向左移动一格，再对角线
            { first: [0, -1], diagonal: [-1, -1], final: [-1, -2] },
            { first: [0, -1], diagonal: [1, -1], final: [1, -2] },
            // 先向右移动一格，再对角线
            { first: [0, 1], diagonal: [-1, 1], final: [-1, 2] },
            { first: [0, 1], diagonal: [1, 1], final: [1, 2] }
        ];

        for (const move of horseMoves) {
            const [firstRow, firstCol] = [row + move.first[0], col + move.first[1]];
            const [finalRow, finalCol] = [row + move.final[0], col + move.final[1]];

            // 检查第一步位置是否有效且无障碍
            if (this.isValidPosition(firstRow, firstCol) && !board[firstRow][firstCol]) {
                // 检查最终位置是否有效
                if (this.isValidPosition(finalRow, finalCol)) {
                    const targetPiece = board[finalRow][finalCol];
                    if (!targetPiece || targetPiece.color !== this.color) {
                        moves.push([finalRow, finalCol]);
                    }
                }
            }
        }

        return moves;
    }



    // 将的移动规则 - 只能横向或纵向移动一格
    getKingMoves(board, row, col) {
        const moves = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]  // 只有上下左右四个方向
        ];

        for (const [drow, dcol] of directions) {
            const newRow = row + drow;
            const newCol = col + dcol;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    // 检查位置是否有效 (9行8列)
    isValidPosition(row, col) {
        return row >= 0 && row < 9 && col >= 0 && col < 8;
    }

    // 移动棋子
    moveTo(newPosition) {
        this.position = newPosition;
        this.hasMoved = true;
    }

    // 士的移动规则 - 斜向移动一格
    getAdvisorMoves(board, row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 1], [1, -1], [1, 1]  // 四个斜向
        ];

        for (const [drow, dcol] of directions) {
            const newRow = row + drow;
            const newCol = col + dcol;

            if (this.isValidPosition(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    // 炮的移动规则 - 需要跳跃一个棋子才能吃子
    getCannonMoves(board, row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [drow, dcol] of directions) {
            let hasJumped = false;
            
            for (let i = 1; i < 9; i++) {
                const newRow = row + drow * i;
                const newCol = col + dcol * i;

                if (!this.isValidPosition(newRow, newCol)) break;

                const targetPiece = board[newRow][newCol];
                
                if (!hasJumped) {
                    // 还没有跳跃过棋子
                    if (!targetPiece) {
                        // 空位可以移动
                        moves.push([newRow, newCol]);
                    } else {
                        // 遇到棋子，标记为已跳跃
                        hasJumped = true;
                    }
                } else {
                    // 已经跳跃过一个棋子
                    if (targetPiece) {
                        // 遇到第二个棋子，如果是敌方棋子可以吃掉
                        if (targetPiece.color !== this.color) {
                            moves.push([newRow, newCol]);
                        }
                        break;
                    }
                    // 继续寻找目标棋子
                }
            }
        }

        return moves;
    }

    // 复制棋子（用于模拟移动）
    clone() {
        const clone = new ChessPiece(this.type, this.color, [...this.position]);
        clone.hasMoved = this.hasMoved;
        return clone;
    }
}