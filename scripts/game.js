// ChessGame - 游戏逻辑管理

class ChessGame {
    constructor() {
        this.board = new ChessBoard();
        this.boardElement = null;
        this.currentPlayerElement = null;
        this.gameStatusElement = null;
        
        this.selectedSquare = null;
        this.validMoves = [];
    }

    // 初始化游戏界面
    initializeUI() {
        this.boardElement = document.getElementById('chessboard');
        this.currentPlayerElement = document.getElementById('current-player');
        this.gameStatusElement = document.getElementById('game-status');

        this.createBoard();
        this.setupEventListeners();
        this.bindModalEvents(); // 预先绑定弹窗事件
        this.setupResizeListener(); // 设置响应式监听
        this.updateUI();
    }

    // 创建线条棋盘UI (9行8列)
    createBoard() {
        console.log('createBoard 开始执行...');
        
        this.boardElement.innerHTML = '';
        
        // 创建SVG网格线
        const linesContainer = document.createElement('div');
        linesContainer.className = 'board-lines';
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        // 绘制竖线 (8条) - 初始值，将在updateBoardLayout中重新计算
        for (let col = 0; col < 8; col++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const x = col * 60;
            line.setAttribute('x1', x);
            line.setAttribute('y1', 0);
            line.setAttribute('x2', x);
            line.setAttribute('y2', 480);
            line.setAttribute('class', 'line');
            svg.appendChild(line);
        }
        
        // 绘制横线 (9条) - 初始值，将在updateBoardLayout中重新计算
        for (let row = 0; row < 9; row++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const y = row * 60;
            line.setAttribute('x1', 0);
            line.setAttribute('y1', y);
            line.setAttribute('x2', 420);
            line.setAttribute('y2', y);
            line.setAttribute('class', 'line');
            svg.appendChild(line);
        }
        
        linesContainer.appendChild(svg);
        this.boardElement.appendChild(linesContainer);
        
        // 创建交叉点 (9x8 = 72个交叉点)
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 8; col++) {
                const intersection = document.createElement('div');
                intersection.className = 'intersection';
                intersection.dataset.row = row;
                intersection.dataset.col = col;
                
                // 初始位置，将在updateBoardLayout中更新
                intersection.style.left = '0px';
                intersection.style.top = '0px';
                
                // 添加点击事件
                intersection.addEventListener('click', () => this.handleSquareClick(row, col));
                
                this.boardElement.appendChild(intersection);
                
                // 创建坐标标签，直接添加到棋盘而不是交叉点内部
                const coordText = document.createElement('div');
                coordText.className = 'coord-text';
                coordText.dataset.row = row;
                coordText.dataset.col = col;
                coordText.textContent = `${row},${col}`;
                coordText.style.cssText = `
                    position: absolute;
                    font-size: 8px;
                    color: #666;
                    font-weight: normal;
                    pointer-events: none;
                    z-index: 5;
                    background: rgba(255,255,255,0.7);
                    padding: 1px 2px;
                    border-radius: 2px;
                    white-space: nowrap;
                `;
                this.boardElement.appendChild(coordText);
                
                console.log(`创建坐标 [${row},${col}] 完成`);
            }
        }
        
        console.log(`总共创建了 ${this.boardElement.querySelectorAll('.intersection').length} 个交叉点`);
        console.log(`总共创建了 ${this.boardElement.querySelectorAll('.coord-text').length} 个坐标标签`);
        
        // 延迟更新布局以确保DOM已渲染
        setTimeout(() => this.updateBoardLayout(), 50);
    }

    // 设置事件监听器
    setupEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo-move').addEventListener('click', () => this.undoMove());
        document.getElementById('reset-board').addEventListener('click', () => this.resetBoard());
    }

    // 处理方格点击事件
    handleSquareClick(row, col) {
        console.log(`点击位置: ${row}行${col}列`);
        const piece = this.board.getPieceAt(row, col);
        console.log('该位置棋子:', piece);
        
        // 如果点击空白处，弹窗选择要放置的棋子
        if (!piece && !this.selectedSquare) {
            console.log('显示棋子放置对话框');
            this.showPiecePlacementDialog(row, col);
            return;
        }
        
        // 如果没有选中的棋子
        if (!this.selectedSquare) {
            if (piece) {
                this.selectSquare(row, col);
            }
            return;
        }

        const [selectedRow, selectedCol] = this.selectedSquare;
        const selectedPiece = this.board.getPieceAt(selectedRow, selectedCol);
        
        // 如果点击的是同一个方格，取消选择
        if (selectedRow === row && selectedCol === col) {
            this.deselectSquare();
            return;
        }

        // 检查是否是有效的移动目标
        if (this.validMoves.some(move => move[0] === row && move[1] === col)) {
            // 这是一个有效的移动位置，执行移动（包括吃子）
            this.attemptMove(selectedRow, selectedCol, row, col);
            return;
        }

        // 如果点击的是其他棋子且不在有效移动范围内，选择新棋子
        if (piece) {
            this.selectSquare(row, col);
            return;
        }

        // 其他情况，取消选择
        this.deselectSquare();
    }

    // 选择方格
    selectSquare(row, col) {
        this.deselectSquare(); // 先清除之前的选择
        
        this.selectedSquare = [row, col];
        const piece = this.board.getPieceAt(row, col);
        console.log(`选中棋子:`, piece);
        
        if (piece) {
            console.log(`棋子详细信息:`, piece);
            this.validMoves = this.board.getValidMoves(piece);
            console.log(`有效移动数量: ${this.validMoves.length}`, this.validMoves);
            
            if (this.validMoves.length === 0) {
                console.log(`警告：${piece.color} ${piece.type} 没有有效移动`);
            }
            
            this.highlightSquare(row, col, 'selected');
            this.highlightValidMoves();
            
            // 如果是黑子，显示删除按钮
            if (piece.color === 'black') {
                this.showDeleteButton(row, col);
            }
        }
    }

    // 取消选择方格
    deselectSquare() {
        this.selectedSquare = null;
        this.validMoves = [];
        this.clearHighlights();
        this.hideDeleteButton();
    }

    // 尝试移动棋子
    attemptMove(fromRow, fromCol, toRow, toCol) {
        console.log(`尝试移动: 从 ${fromRow},${fromCol} 到 ${toRow},${toCol}`);
        const piece = this.board.getPieceAt(fromRow, fromCol);
        const target = this.board.getPieceAt(toRow, toCol);
        console.log(`移动棋子:`, piece, `目标位置:`, target);
        
        const success = this.board.movePiece(fromRow, fromCol, toRow, toCol);
        console.log(`移动结果: ${success}`);
        
        if (success) {
            this.deselectSquare();
            this.updateUI();
            this.checkGameEnd();
        } else {
            // 移动无效，保持当前选择或取消选择
            console.log('移动失败，取消选择');
            this.deselectSquare();
        }
    }

    // 高亮交叉点
    highlightSquare(row, col, className) {
        const intersection = this.getSquareElement(row, col);
        if (intersection) {
            intersection.classList.add(className);
        }
    }

    // 高亮有效移动
    highlightValidMoves() {
        console.log(`开始高亮 ${this.validMoves.length} 个有效移动`);
        console.log(`validMoves内容:`, this.validMoves);
        
        // 计算最佳落点（只针对红车）
        let bestMoveIndex = -1;
        const selectedPiece = this.board.getPieceAt(this.selectedSquare[0], this.selectedSquare[1]);
        console.log(`选中棋子信息:`, selectedPiece);
        console.log(`棋子颜色:`, selectedPiece?.color, `棋子类型:`, selectedPiece?.type);
        
        if (selectedPiece && selectedPiece.color === 'red' && selectedPiece.type === 'rook' && this.validMoves.length > 0) {
            console.log(`红车条件满足，计算最佳落点`);
            bestMoveIndex = this.calculateBestMove(selectedPiece, this.validMoves);
        } else {
            console.log(`红车条件不满足或无有效移动`);
        }
        
        this.validMoves.forEach(([row, col], index) => {
            const intersection = this.getSquareElement(row, col);
            console.log(`处理位置 ${row},${col}, 找到元素:`, intersection);
            if (intersection) {
                const piece = this.board.getPieceAt(row, col);
                
                // 检查是否是最佳落点
                if (index === bestMoveIndex) {
                    // 最佳落点：如果有棋子则同时显示吃子效果和最佳标识
                    if (piece) {
                        intersection.classList.add('capture-move');
                        intersection.classList.add('best-capture');
                    } else {
                        intersection.classList.add('best-move');
                    }
                    
                    // 添加五角星标识（在棋子上方）
                    const star = document.createElement('div');
                    star.className = 'best-move-star';
                    star.innerHTML = '⭐';
                    intersection.appendChild(star);
                } else {
                    // 针对红车检查位置是否危险
                    if (selectedPiece && selectedPiece.color === 'red' && selectedPiece.type === 'rook') {
                        const isDangerous = !this.getSafetyScore(selectedPiece, row, col);
                        if (isDangerous) {
                            const className = piece ? 'capture-move danger-move' : 'danger-move';
                            intersection.classList.add('danger-move');
                            if (piece) intersection.classList.add('capture-move');
                        } else {
                            const className = piece ? 'capture-move' : 'valid-move';
                            intersection.classList.add(className);
                        }
                    } else {
                        const className = piece ? 'capture-move' : 'valid-move';
                        intersection.classList.add(className);
                    }
                }
                console.log(`添加样式完成`);
            } else {
                console.log(`警告: 未找到位置 ${row},${col} 的交叉点元素`);
            }
        });
    }

    // 清除所有高亮
    clearHighlights() {
        const intersections = this.boardElement.querySelectorAll('.intersection');
        intersections.forEach(intersection => {
            intersection.classList.remove('selected', 'valid-move', 'capture-move', 'in-check', 'best-move', 'best-capture', 'danger-move');
            // 移除五角星标识
            const stars = intersection.querySelectorAll('.best-move-star');
            stars.forEach(star => star.remove());
        });
    }

    // 获取交叉点元素
    getSquareElement(row, col) {
        return this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    // 更新UI显示
    updateUI() {
        this.updateBoard();
        this.updateCurrentPlayer();
        this.updateGameStatus();
        this.highlightKingInCheck();
    }

    // 更新棋盘显示
    updateBoard() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 8; col++) {
                const intersection = this.getSquareElement(row, col);
                const piece = this.board.getPieceAt(row, col);
                
                if (intersection) {
                    intersection.innerHTML = '';
                    if (piece) {
                        const pieceElement = document.createElement('div');
                        pieceElement.className = `chinese-piece ${piece.color}`;
                        pieceElement.textContent = piece.getSymbol();
                        intersection.appendChild(pieceElement);
                    }
                }
            }
        }
    }

    // 更新当前玩家显示
    updateCurrentPlayer() {
        if (this.currentPlayerElement) {
            const playerText = this.board.currentPlayer === 'red' ? '红方' : '黑方';
            this.currentPlayerElement.textContent = playerText;
        }
    }

    // 更新游戏状态显示
    updateGameStatus() {
        if (this.gameStatusElement) {
            let statusText = '';
            switch (this.board.gameStatus) {
                case 'playing':
                    statusText = '游戏进行中';
                    break;
                case 'check':
                    statusText = '将军！';
                    break;
                case 'checkmate':
                    const winner = this.board.currentPlayer === 'red' ? '黑方' : '红方';
                    statusText = `将死！${winner}获胜`;
                    break;
                case 'stalemate':
                    statusText = '和棋（无子可动）';
                    break;
            }
            this.gameStatusElement.textContent = statusText;
        }
    }



    // 高亮被将军的王
    highlightKingInCheck() {
        if (this.board.gameStatus === 'check' || this.board.gameStatus === 'checkmate') {
            const king = this.board.findKing(this.board.currentPlayer);
            if (king) {
                this.highlightSquare(king.position[0], king.position[1], 'in-check');
            }
        }
    }

    // 检查游戏是否结束
    checkGameEnd() {
        if (this.board.gameStatus === 'checkmate') {
            const winner = this.board.currentPlayer === 'red' ? '黑方' : '红方';
            setTimeout(() => {
                console.log(`游戏结束！${winner}获胜！`);
            }, 100);
        } else if (this.board.gameStatus === 'stalemate') {
            setTimeout(() => {
                console.log('游戏结束！和棋（无子可动）！');
            }, 100);
        }
    }

    // 新游戏
    newGame() {
        if (confirm('确定要开始新游戏吗？')) {
            this.board.reset();
            this.deselectSquare();
            this.updateUI();
        }
    }

    // 撤销移动
    undoMove() {
        const success = this.board.undoLastMove();
        if (success) {
            this.deselectSquare();
            this.updateUI();
        } else {
            console.log('没有可以撤销的移动！');
        }
    }

    // 重置棋盘
    resetBoard() {
        if (confirm('确定要重置棋盘吗？')) {
            this.newGame();
        }
    }

    // 显示棋子放置对话框
    showPiecePlacementDialog(row, col) {
        const modal = document.getElementById('piece-selection-modal');
        
        // 存储当前选择的位置
        this.modalRow = row;
        this.modalCol = col;
        
        // 直接显示弹窗
        modal.style.display = 'flex';
    }
    
    // 绑定模态对话框事件
    bindModalEvents() {
        const modal = document.getElementById('piece-selection-modal');
        
        // 使用事件委托，只绑定一次
        modal.addEventListener('click', (e) => {
            // 点击背景关闭
            if (e.target === modal) {
                modal.style.display = 'none';
                return;
            }
            
            // 取消按钮
            if (e.target.id === 'modal-cancel') {
                modal.style.display = 'none';
                return;
            }
            
            // 棋子选择按钮
            if (e.target.classList.contains('piece-btn')) {
                const type = e.target.getAttribute('data-type');
                const color = e.target.getAttribute('data-color');
                this.placePiece(this.modalRow, this.modalCol, type, color);
                modal.style.display = 'none';
            }
        });
    }

    // 设置响应式监听器
    setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateBoardLayout();
            }, 150); // 防抖延迟
        });
    }

    // 更新棋盘布局
    updateBoardLayout() {
        const boardElement = this.boardElement;
        const boardLines = boardElement.querySelector('.board-lines');
        
        if (!boardLines) return;
        
        // 获取board-lines的实际尺寸
        const linesRect = boardLines.getBoundingClientRect();
        const gridWidth = linesRect.width;
        const gridHeight = linesRect.height;
        
        if (gridWidth <= 0 || gridHeight <= 0) return;
        
        const cellWidth = gridWidth / 7; // 7个间隔
        const cellHeight = gridHeight / 8; // 8个间隔
        
        // 获取board-lines相对于棋盘的偏移
        const boardRect = boardElement.getBoundingClientRect();
        const offsetX = linesRect.left - boardRect.left;
        const offsetY = linesRect.top - boardRect.top;
        
        // 保存尺寸供其他函数使用
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.boardPadding = offsetX;
        
        // 更新SVG网格线
        const svg = boardLines.querySelector('svg');
        if (svg) {
            // 重新绘制网格线
            svg.innerHTML = '';
            
            // 绘制竖线 (8条)
            for (let col = 0; col < 8; col++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const x = col * cellWidth;
                line.setAttribute('x1', x);
                line.setAttribute('y1', 0);
                line.setAttribute('x2', x);
                line.setAttribute('y2', gridHeight);
                line.setAttribute('class', 'line');
                svg.appendChild(line);
            }
            
            // 绘制横线 (9条)
            for (let row = 0; row < 9; row++) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const y = row * cellHeight;
                line.setAttribute('x1', 0);
                line.setAttribute('y1', y);
                line.setAttribute('x2', gridWidth);
                line.setAttribute('y2', y);
                line.setAttribute('class', 'line');
                svg.appendChild(line);
            }
        }
        
        // 更新交叉点位置
        const intersections = boardElement.querySelectorAll('.intersection');
        intersections.forEach(intersection => {
            const row = parseInt(intersection.dataset.row);
            const col = parseInt(intersection.dataset.col);
            
            const intersectionSize = Math.min(cellWidth, cellHeight) * 0.8;
            intersection.style.width = intersectionSize + 'px';
            intersection.style.height = intersectionSize + 'px';
            
            intersection.style.left = (offsetX + col * cellWidth - intersectionSize / 2) + 'px';
            intersection.style.top = (offsetY + row * cellHeight - intersectionSize / 2) + 'px';
        });
        
        // 更新坐标标签位置
        const coordTexts = boardElement.querySelectorAll('.coord-text');
        coordTexts.forEach(coordText => {
            const row = parseInt(coordText.dataset.row);
            const col = parseInt(coordText.dataset.col);
            
            const centerX = offsetX + col * cellWidth;
            const centerY = offsetY + row * cellHeight;
            
            // 显示在交叉点的左上角
            coordText.style.left = (centerX - 20) + 'px';
            coordText.style.top = (centerY - 20) + 'px';
        });
        
        // 更新删除按钮位置（如果存在）
        const deleteBtn = document.getElementById('current-delete-btn');
        if (deleteBtn && deleteBtn.dataset.row && deleteBtn.dataset.col) {
            const row = parseInt(deleteBtn.dataset.row);
            const col = parseInt(deleteBtn.dataset.col);
            const centerX = offsetX + col * cellWidth;
            const centerY = offsetY + row * cellHeight;
            deleteBtn.style.left = centerX + 'px';
            deleteBtn.style.top = centerY + 'px';
        }
    }

    // 放置棋子
    placePiece(row, col, pieceType, color) {
        const newPiece = new ChessPiece(pieceType, color, [row, col]);
        this.board.setPieceAt(row, col, newPiece);
        this.updateUI();
    }

    // 显示删除按钮
    showDeleteButton(row, col) {
        this.hideDeleteButton(); // 先移除之前的删除按钮
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-piece-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.id = 'current-delete-btn';
        deleteBtn.dataset.row = row;
        deleteBtn.dataset.col = col;
        
        // 使用动态尺寸计算位置
        const cellWidth = this.cellWidth || 60;
        const cellHeight = this.cellHeight || 60;
        const padding = this.boardPadding || 30;
        
        const centerX = padding + col * cellWidth;
        const centerY = padding + row * cellHeight;
        
        deleteBtn.style.left = centerX + 'px';
        deleteBtn.style.top = centerY + 'px';
        deleteBtn.style.transform = 'translate(-50%, -50%)';
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deletePiece(row, col);
        });
        
        this.boardElement.appendChild(deleteBtn);
    }

    // 计算最佳落点
    calculateBestMove(piece, validMoves) {
        let bestScore = -1000;
        let bestMoveIndex = -1;
        
        // 先筛选出安全的移动
        const safeMoves = [];
        validMoves.forEach((move, index) => {
            const [row, col] = move;
            const isSafe = this.getSafetyScore(piece, row, col);
            
            if (isSafe) {
                safeMoves.push({move, index});
            }
        });

        if (safeMoves.length === 0) {
            return -1;
        }

        // 在安全移动中计算最佳落点
        safeMoves.forEach(({move, index}) => {
            const [row, col] = move;
            let score = 0;
            
            // 1. 吃子价值评估（最高优先级）
            const targetPiece = this.board.getPieceAt(row, col);
            if (targetPiece && targetPiece.color !== piece.color) {
                const captureScore = this.getPieceValue(targetPiece.type) * 1000;
                score += captureScore;
            } else {
                // 2. 位置战术价值评估（无吃子时的次优选择）
                const positionScore = this.getPositionalValue(piece, row, col);
                score += positionScore;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMoveIndex = index;
            }
        });
        
        return bestMoveIndex;
    }
    
    // 获取棋子价值
    getPieceValue(pieceType) {
        const values = {
            'pawn': 8,      // 卒
            'advisor': 8,   // 士
            'bishop': 15,   // 象
            'cannon': 20,   // 炮
            'knight': 20,   // 马
            'rook': 30,     // 车
            'king': 100     // 将
        };
        return values[pieceType] || 8;
    }
    
    // 获取位置战术价值（专为红车计算最佳落点）
    getPositionalValue(piece, row, col) {
        // 只有红车需要AI计算，黑子由玩家手动放置
        if (piece.color !== 'red' || piece.type !== 'rook') {
            return 0;
        }
        
        let value = 0;
        
        // 1. 逃生路线评估 - 避免被包围的位置
        const escapeRoutes = this.countEscapeRoutes(row, col);
        value += escapeRoutes * 2; // 每条逃生路线+2分
        
        // 2. 攻击威胁评估 - 重点奖励多重威胁（叉攻）
        const attackTargets = this.countAttackableEnemies(piece, row, col);
        if (attackTargets >= 2) {
            // 多重威胁（叉攻）- 敌方无法同时保护多个目标
            value += attackTargets * 15; // 多重威胁高分奖励
        } else if (attackTargets === 1) {
            // 单一威胁 - 敌方容易逃脱，价值较低
            value += 1; // 单一威胁只给1分
        }
        
        // 3. 边角陷阱避免 - 红车应避免被困在角落
        if ((row === 0 || row === 8) && (col === 0 || col === 7)) {
            value -= 10; // 角落严重减分
        }
        
        return Math.max(0, value);
    }
    
    // 计算逃生路线数量（红车专用）
    countEscapeRoutes(row, col) {
        let routes = 0;
        const directions = [[0,1], [0,-1], [1,0], [-1,0]]; // 车的四个方向
        
        for (const [dr, dc] of directions) {
            let steps = 0;
            let r = row + dr;
            let c = col + dc;
            
            // 计算这个方向能走多少步
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                if (this.board.getPieceAt(r, c)) break; // 遇到棋子停止
                steps++;
                r += dr;
                c += dc;
            }
            
            if (steps > 2) routes++; // 只有能走3步以上才算有效逃生路线
        }
        
        return routes;
    }
    
    // 计算可攻击的敌方棋子数量（专为红车优化）
    countAttackableEnemies(piece, row, col) {
        let count = 0;
        const threatenedPieces = [];
        
        if (piece.type === 'rook') {
            // 车的四个方向直线攻击
            const directions = [
                [0, 1, '右'],   // 向右
                [0, -1, '左'],  // 向左  
                [1, 0, '下'],   // 向下
                [-1, 0, '上']   // 向上
            ];
            
            for (const [dr, dc, direction] of directions) {
                let r = row + dr;
                let c = col + dc;
                let foundEnemies = [];
                
                // 沿直线寻找所有敌方棋子
                while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                    const targetPiece = this.board.getPieceAt(r, c);
                    if (targetPiece) {
                        if (targetPiece.color !== piece.color) {
                            foundEnemies.push({piece: targetPiece, pos: [r, c]});
                        } else {
                            break; // 遇到己方棋子停止
                        }
                    }
                    r += dr;
                    c += dc;
                }
                
                // 分析这个方向的威胁情况
                if (foundEnemies.length === 1) {
                    // 单个敌方棋子，直接威胁
                    count++;
                    threatenedPieces.push(`${foundEnemies[0].piece.type}(${foundEnemies[0].pos[0]},${foundEnemies[0].pos[1]})`);
                } else if (foundEnemies.length === 2) {
                    // 两个敌方棋子，连续威胁战术
                    count += 2; // 两个都算作威胁
                    foundEnemies.forEach(enemy => {
                        threatenedPieces.push(`${enemy.piece.type}(${enemy.pos[0]},${enemy.pos[1]})`);
                    });
                } else if (foundEnemies.length > 2) {
                    // 三个或更多敌方棋子，算作多重威胁
                    count += foundEnemies.length;
                    foundEnemies.forEach(enemy => {
                        threatenedPieces.push(`${enemy.piece.type}(${enemy.pos[0]},${enemy.pos[1]})`);
                    });
                }
            }
        }
        
        return count;
    }
    

    
    // 获取安全性得分
    getSafetyScore(piece, row, col) {
        // 临时移除当前棋子，模拟移动后的棋盘状态
        const originalPiece = this.board.getPieceAt(piece.position[0], piece.position[1]);
        this.board.setPieceAt(piece.position[0], piece.position[1], null);
        
        // 检查目标位置是否会被敌方棋子攻击
        const isUnderAttack = this.isPositionUnderAttack(row, col, piece.color);
        
        // 恢复原来的棋子
        this.board.setPieceAt(piece.position[0], piece.position[1], originalPiece);
        
        return !isUnderAttack;
    }
    
    // 检查位置是否被敌方攻击
    isPositionUnderAttack(row, col, myColor) {
        // 检查所有敌方棋子是否能攻击到这个位置
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 8; c++) {
                const enemyPiece = this.board.getPieceAt(r, c);
                if (enemyPiece && enemyPiece.color !== myColor) {
                    // 跳过目标位置本身的棋子（因为我们要吃掉它）
                    if (r === row && c === col) {
                        continue;
                    }
                    
                    // 根据棋子类型检查是否能攻击目标位置
                    if (this.canPieceAttack(enemyPiece, r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    // 检查棋子是否可以攻击到指定位置（参考算法优化）
    canPieceAttack(piece, pieceRow, pieceCol, targetRow, targetCol) {
        switch (piece.type) {
            case 'pawn':
                // 黑卒可以上下左右移动一步，所以能攻击相邻的位置
                return Math.abs(pieceRow - targetRow) + Math.abs(pieceCol - targetCol) === 1;

            case 'rook':
                // 车走直线且不能越子
                if (pieceRow !== targetRow && pieceCol !== targetCol) return false;
                
                // 检查路径上是否有障碍物（不包括目标位置）
                if (pieceRow === targetRow) {
                    // 水平移动
                    const minCol = Math.min(pieceCol, targetCol);
                    const maxCol = Math.max(pieceCol, targetCol);
                    for (let c = minCol + 1; c < maxCol; c++) {
                        if (this.board.getPieceAt(pieceRow, c)) {
                            return false; // 路径被阻挡
                        }
                    }
                } else {
                    // 垂直移动
                    const minRow = Math.min(pieceRow, targetRow);
                    const maxRow = Math.max(pieceRow, targetRow);
                    for (let r = minRow + 1; r < maxRow; r++) {
                        if (this.board.getPieceAt(r, pieceCol)) {
                            return false; // 路径被阻挡
                        }
                    }
                }
                return true;

            case 'knight':
                // 马走日字
                if ((Math.abs(pieceRow - targetRow) === 1 && Math.abs(pieceCol - targetCol) === 2) ||
                    (Math.abs(pieceRow - targetRow) === 2 && Math.abs(pieceCol - targetCol) === 1)) {
                    // 检查蹩马腿
                    if (Math.abs(pieceRow - targetRow) === 1) {
                        // 竖着的日，检查横向的别腿点
                        const blockRow = pieceRow + (targetRow > pieceRow ? 1 : -1);
                        return !this.board.getPieceAt(blockRow, pieceCol);
                    } else {
                        // 横着的日，检查纵向的别腿点
                        const blockCol = pieceCol + (targetCol > pieceCol ? 1 : -1);
                        return !this.board.getPieceAt(pieceRow, blockCol);
                    }
                }
                return false;

            case 'cannon':
                // 炮必须在同一直线上
                if (pieceRow !== targetRow && pieceCol !== targetCol) return false;
                
                // 计算炮和目标位置之间的棋子数
                const pieceCount = this.countPiecesInPath(pieceRow, pieceCol, targetRow, targetCol);
                
                // 炮攻击需要隔一个子
                return pieceCount === 1;

            case 'bishop':
                // 象走田字格
                if (Math.abs(pieceRow - targetRow) === 2 && Math.abs(pieceCol - targetCol) === 2) {
                    // 象眼位置
                    const eyeRow = (pieceRow + targetRow) / 2;
                    const eyeCol = (pieceCol + targetCol) / 2;
                    // 检查象眼是否被塞
                    return !this.board.getPieceAt(eyeRow, eyeCol);
                }
                return false;

            case 'advisor':
                // 士走对角线一格
                return Math.abs(pieceRow - targetRow) === 1 && Math.abs(pieceCol - targetCol) === 1;

            case 'king':
                // 将可以上下左右走一格
                return Math.abs(pieceRow - targetRow) + Math.abs(pieceCol - targetCol) === 1;

            default:
                return false;
        }
    }

    // 检查路径上是否有棋子阻挡
    isPathBlocked(fromRow, fromCol, toRow, toCol) {
        return this.countPiecesInPath(fromRow, fromCol, toRow, toCol) > 0;
    }

    // 计算路径上的棋子数量
    countPiecesInPath(fromRow, fromCol, toRow, toCol) {
        let count = 0;

        if (fromRow === toRow) {
            // 水平移动
            const minCol = Math.min(fromCol, toCol);
            const maxCol = Math.max(fromCol, toCol);
            for (let c = minCol + 1; c < maxCol; c++) {
                if (this.board.getPieceAt(fromRow, c)) {
                    count++;
                }
            }
        } else if (fromCol === toCol) {
            // 垂直移动
            const minRow = Math.min(fromRow, toRow);
            const maxRow = Math.max(fromRow, toRow);
            for (let r = minRow + 1; r < maxRow; r++) {
                if (this.board.getPieceAt(r, fromCol)) {
                    count++;
                }
            }
        }

        return count;
    }
    


    // 隐藏删除按钮
    hideDeleteButton() {
        const existingBtn = document.getElementById('current-delete-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
    }
    
    // 删除棋子
    deletePiece(row, col) {
        const piece = this.board.getPieceAt(row, col);
        if (piece && piece.color === 'black') {
            this.board.removePiece(row, col);
            this.deselectSquare();
            this.updateBoard();
            this.updateGameStatus('已删除黑子');
            console.log(`删除了位置 ${row}行${col}列 的黑子`);
        }
    }
}