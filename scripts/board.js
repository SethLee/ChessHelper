// ChessHelper - 棋盘管理

class ChessBoard {
    constructor() {
        this.board = this.createEmptyBoard();
        this.selectedSquare = null;
        this.currentPlayer = Color.RED;
        this.gameHistory = [];
        this.capturedPieces = {
            [Color.WHITE]: [],
            [Color.BLACK]: []
        };
        this.gameStatus = 'playing'; // playing, check, checkmate, stalemate
        
        this.initializeBoard();
    }

    // 创建空棋盘 (9行8列)
    createEmptyBoard() {
        return Array(9).fill(null).map(() => Array(8).fill(null));
    }

    // 初始化棋盘上的棋子
    initializeBoard() {
        // 清空棋盘
        this.board = this.createEmptyBoard();
        
        // 在第三行（索引2）的第4、6、8列（索引3、5、7）放置卒
        this.board[2][3] = new ChessPiece(PieceType.PAWN, Color.BLACK, [2, 3]);
        this.board[2][5] = new ChessPiece(PieceType.PAWN, Color.BLACK, [2, 5]);
        this.board[2][7] = new ChessPiece(PieceType.PAWN, Color.BLACK, [2, 7]);
        
        // 在第七行第4列（索引6,3）放置红色车
        this.board[6][3] = new ChessPiece(PieceType.ROOK, Color.RED, [6, 3]);
    }

    // 获取指定位置的棋子
    getPieceAt(row, col) {
        if (row < 0 || row >= 9 || col < 0 || col >= 8) {
            return null;
        }
        return this.board[row][col];
    }

    // 设置棋子到指定位置
    setPieceAt(row, col, piece) {
        if (row >= 0 && row < 9 && col >= 0 && col < 8) {
            this.board[row][col] = piece;
            if (piece) {
                piece.position = [row, col];
            }
        }
    }

    // 删除指定位置的棋子
    removePiece(row, col) {
        if (row >= 0 && row < 9 && col >= 0 && col < 8) {
            this.board[row][col] = null;
            return true;
        }
        return false;
    }

    // 移动棋子
    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        const capturedPiece = this.getPieceAt(toRow, toCol);
        


        if (!piece) {

            return false;
        }

        // 检查是否是有效移动
        const isValid = this.isValidMove(piece, toRow, toCol);

        if (!isValid) {
            return false;
        }

        // 保存移动记录
        const move = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece.clone(),
            capturedPiece: capturedPiece ? capturedPiece.clone() : null,
            player: this.currentPlayer
        };

        // 如果有吃子，直接移除被吃棋子（不记录）
        if (capturedPiece) {

        }

        // 执行移动
        this.setPieceAt(toRow, toCol, piece);
        this.setPieceAt(fromRow, fromCol, null);
        piece.moveTo([toRow, toCol]);

        // 添加到历史记录
        this.gameHistory.push(move);

        // 检查兵的升变
        this.checkPawnPromotion(piece, toRow);

        // 切换玩家
        this.currentPlayer = this.currentPlayer === Color.WHITE ? Color.BLACK : Color.WHITE;

        // 检查分析状态
        this.updateGameStatus();

        return true;
    }

    // 检查移动是否有效
    isValidMove(piece, toRow, toCol) {
        if (!piece) {

            return false;
        }

        // 检查目标位置是否在棋盘内
        if (toRow < 0 || toRow >= 9 || toCol < 0 || toCol >= 8) {

            return false;
        }

        // 检查目标位置是否有己方棋子
        const targetPiece = this.getPieceAt(toRow, toCol);
        if (targetPiece && targetPiece.color === piece.color) {

            return false;
        }

        // 检查棋子的移动规则
        const possibleMoves = piece.getPossibleMoves(this.board);

        const isLegalMove = possibleMoves.some(move => move[0] === toRow && move[1] === toCol);


        return isLegalMove;
    }

    // 检查移动后是否会被将军
    wouldBeInCheckAfterMove(piece, toRow, toCol) {
        // 复制当前棋盘状态
        const originalBoard = this.cloneBoard();
        const originalPiece = this.getPieceAt(toRow, toCol);

        // 模拟移动
        this.setPieceAt(toRow, toCol, piece);
        this.setPieceAt(piece.position[0], piece.position[1], null);
        piece.position = [toRow, toCol];

        // 检查是否被将军
        const inCheck = this.isInCheck(piece.color);

        // 恢复棋盘状态
        this.board = originalBoard;
        piece.position = [piece.position[0], piece.position[1]];

        return inCheck;
    }

    // 检查指定颜色的王是否被将军
    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) return false;

        const opponentColor = color === Color.RED ? Color.BLACK : Color.RED;
        
        // 检查对方所有棋子是否能攻击到己方王
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === opponentColor) {
                    const moves = piece.getPossibleMoves(this.board);
                    if (moves.some(move => move[0] === king.position[0] && move[1] === king.position[1])) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // 找到指定颜色的王
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.type === PieceType.KING && piece.color === color) {
                    return piece;
                }
            }
        }
        return null;
    }

    // 仙奕破阵不需要升变逻辑
    checkPawnPromotion(piece, row) {
        // 仙奕破阵的兵/卒不会升变
        return;
    }

    // 更新分析状态
    updateGameStatus() {
        const currentPlayerInCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);

        if (currentPlayerInCheck) {
            if (!hasValidMoves) {
                this.gameStatus = 'checkmate';
            } else {
                this.gameStatus = 'check';
            }
        } else if (!hasValidMoves) {
            this.gameStatus = 'stalemate';
        } else {
            this.gameStatus = 'playing';
        }
    }

    // 检查当前玩家是否有有效移动
    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === color) {
                    const moves = piece.getPossibleMoves(this.board);
                    for (const move of moves) {
                        if (this.isValidMove(piece, move[0], move[1])) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // 撤销上一步移动
    undoLastMove() {
        if (this.gameHistory.length === 0) return false;

        const lastMove = this.gameHistory.pop();
        const { from, to, piece, capturedPiece, player } = lastMove;

        // 恢复棋子位置
        this.setPieceAt(from[0], from[1], piece);
        piece.position = from;
        
        // 恢复被吃的棋子
        if (capturedPiece) {
            this.setPieceAt(to[0], to[1], capturedPiece);
            // 从被吃棋子列表中移除
            const capturedList = this.capturedPieces[player];
            const index = capturedList.findIndex(p => p.type === capturedPiece.type && p.color === capturedPiece.color);
            if (index !== -1) {
                capturedList.splice(index, 1);
            }
        } else {
            this.setPieceAt(to[0], to[1], null);
        }

        // 恢复玩家
        this.currentPlayer = player;

        // 更新分析状态
        this.updateGameStatus();

        return true;
    }

    // 复制棋盘
    cloneBoard() {
        const newBoard = this.createEmptyBoard();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                newBoard[row][col] = piece ? piece.clone() : null;
            }
        }
        return newBoard;
    }

    // 重置棋盘
    reset() {
        this.selectedSquare = null;
        this.currentPlayer = Color.RED;
        this.gameHistory = [];
        this.gameStatus = 'playing';
        this.initializeBoard();
    }

    // 获取有效移动（用于高亮显示）
    getValidMoves(piece) {
        if (!piece) {
            return [];
        }

        const moves = piece.getPossibleMoves(this.board);
        return moves.filter(move => this.isValidMove(piece, move[0], move[1]));
    }
}