// ChessHelper - 分析逻辑管理

class ChessHelper {
    constructor() {
        this.board = new ChessBoard();
        this.boardElement = null;
        this.currentPlayerElement = null;
        this.gameStatusElement = null;
        
        this.selectedSquare = null;
        this.validMoves = [];
        this.kingCaptured = false; // 是否刚吃掉将，下次移动触发十字消除
        this.shouldExecuteElimination = false; // 是否应该执行十字消除
    }

    // 初始化分析界面
    initializeUI() {
        this.boardElement = document.getElementById('chessboard');

        this.createBoard();
        this.setupEventListeners();
        this.bindModalEvents(); // 预先绑定弹窗事件
        this.setupResizeListener(); // 设置响应式监听
        this.setupCoordinateToggle(); // 设置坐标显示开关
        this.updateUI();
    }

    // 创建线条棋盘UI (9行8列)
    createBoard() {

        
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
            }
        }
        

        
        // 延迟更新布局以确保DOM已渲染
        setTimeout(() => this.updateBoardLayout(), 50);
    }

    // 设置事件监听器
    setupEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo-move').addEventListener('click', () => this.undoMove());
    }
    
    // 设置坐标显示开关
    setupCoordinateToggle() {
        const checkbox = document.getElementById('show-coordinates');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                this.toggleCoordinateDisplay(checkbox.checked);
            });
            
            // 初始状态不显示坐标
            checkbox.checked = false;
            this.toggleCoordinateDisplay(false);
        }
    }
    
    // 切换坐标显示
    toggleCoordinateDisplay(show) {
        const coordTexts = this.boardElement.querySelectorAll('.coord-text');
        coordTexts.forEach(coord => {
            if (show) {
                coord.classList.add('show');
            } else {
                coord.classList.remove('show');
            }
        });
    }

    // 处理方格点击事件
    handleSquareClick(row, col) {
        const piece = this.board.getPieceAt(row, col);
        
        // 如果点击空白处，弹窗选择要放置的棋子
        if (!piece && !this.selectedSquare) {
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

        
        if (piece) {

            this.validMoves = this.board.getValidMoves(piece);
            // 计算有效移动
            
            if (this.validMoves.length === 0) {

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
        const piece = this.board.getPieceAt(fromRow, fromCol);
        const target = this.board.getPieceAt(toRow, toCol);
        
        const success = this.board.movePiece(fromRow, fromCol, toRow, toCol);
        
        if (success) {
            // 🎯 关键修复：检查是否是红车移动且有buff状态
            if (piece && piece.color === 'red' && piece.type === 'rook' && this.kingCaptured) {
                console.log(`🎯 红车移动触发十字消除! buff状态: ${this.kingCaptured}`);
                this.shouldExecuteElimination = true; // 标记需要执行十字消除
            }
            
            // 检查本次移动是否红车吃将（获得首次buff）
            if (piece && piece.color === 'red' && piece.type === 'rook' && target && target.type === 'king') {
                console.log(`🌟 红车吃将，获得首次十字消除buff!`);
                this.kingCaptured = true; // 标记吃将状态，下次移动时触发消除
            }
            
            this.deselectSquare();
            this.updateUI();
        } else {
            // 移动无效，保持当前选择或取消选择
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


        
        // 计算最佳落点（只针对红车）
        let bestMoveIndex = -1;
        const selectedPiece = this.board.getPieceAt(this.selectedSquare[0], this.selectedSquare[1]);


        
        if (selectedPiece && selectedPiece.color === 'red' && selectedPiece.type === 'rook' && this.validMoves.length > 0) {
            // 红车条件满足，计算最佳落点
            bestMoveIndex = this.calculateBestMove(selectedPiece, this.validMoves);
            
            // 如果红车有十字消除buff，在控制台显示调试信息
            if (this.kingCaptured) {
                console.log('🎯 红车获得十字消除buff，AI正在计算最佳消除位置...');
            }
        } else {
            // 红车条件不满足或无有效移动
        }
        
        this.validMoves.forEach(([row, col], index) => {
            const intersection = this.getSquareElement(row, col);

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

            } else {

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
        // 先更新棋盘显示（包含发光效果）
        this.updateBoard();
        this.highlightKingInCheck();
        
        // 然后检查是否应该执行十字消除
        if (this.shouldExecuteElimination && this.kingCaptured) {
            // 延迟执行十字消除，让用户先看到发光效果
            setTimeout(() => {
                console.log(`🎯 开始首次十字消除...`);
                // 🎯 先重置执行标记，避免重复触发
                this.shouldExecuteElimination = false;
                this.executeCrossElimination();
                // executeCrossElimination会根据是否击杀将来决定是否保持buff
            }, 300);
        }
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
                        
                        // 如果是红车且刚吃了将，添加发光效果和文字提示
                        if (piece.color === 'red' && piece.type === 'rook' && this.kingCaptured) {
                            pieceElement.classList.add('king-captured-glow');
                            
                            // 添加十字消除提示文字
                            const hint = document.createElement('div');
                            hint.className = 'cross-elimination-hint';
                            hint.textContent = '十字消除';
                            intersection.appendChild(hint);
                        }
                        
                        pieceElement.textContent = piece.getSymbol();
                        intersection.appendChild(pieceElement);
                    }
                }
            }
        }
    }
    
    // 执行十字消除
    executeCrossElimination() {
        // 找到红车位置
        let redRookPos = null;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board.getPieceAt(row, col);
                if (piece && piece.color === 'red' && piece.type === 'rook') {
                    redRookPos = [row, col];
                    break;
                }
            }
            if (redRookPos) break;
        }
        
        if (!redRookPos) return; // 没找到红车，不执行消除
        
        const [rookRow, rookCol] = redRookPos;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
        let eliminatedKings = 0; // 记录消除的将的数量
        
        console.log(`⚡ 执行十字消除 位置(${rookRow},${rookCol})`);
        
        // 四个方向分别消除黑子
        directions.forEach(([dr, dc]) => {
            let r = rookRow + dr;
            let c = rookCol + dc;
            
            // 沿直线消除所有黑子，直到边界
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                const piece = this.board.getPieceAt(r, c);
                if (piece && piece.color === 'black') {
                    // 🎯 检查是否消除了将
                    if (piece.type === 'king') {
                        eliminatedKings++;
                        console.log(`🌟 十字消除击杀将! 位置(${r},${c})`);
                    }
                    this.board.removePiece(r, c); // 消除黑子
                }
                r += dr;
                c += dc;
            }
        });
        
        // 🎯 buff消耗逻辑：执行十字消除后，先消耗当前buff
        console.log(`💫 十字消除执行完毕，消耗buff...`);
        this.kingCaptured = false; // 先消耗掉当前的buff
        
        // 🎯 立即更新棋盘显示，让红车失去发光效果
        this.updateBoard();
        
        // 🎯 连锁逻辑：如果消除了将，获得新的buff
        if (eliminatedKings > 0) {
            console.log(`🔥 消除了${eliminatedKings}个将，获得新的连锁buff!`);
            // 延迟一下让用户看到buff消失的效果，然后给予新buff
            setTimeout(() => {
                this.kingCaptured = true; // 获得新的buff，等待下次移动触发
                this.updateBoard(); // 重新更新显示，让红车重新发光
                console.log(`🎯 连锁buff已获得，红车重新发光！下次移动将触发十字消除`);
            }, 500);
        } else {
            // 没有消除将，彻底结束
            console.log(`✨ 十字消除完成，无更多连锁，buff已消耗`);
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

    // 重置棋盘
    newGame() {
        this.board.reset();
        this.deselectSquare();
        this.kingCaptured = false; // 重置吃将状态
        this.shouldExecuteElimination = false; // 重置执行标记
        this.updateUI();
    }

    // 撤销移动
    undoMove() {
        const success = this.board.undoLastMove();
        if (success) {
            this.deselectSquare();
            this.updateUI();
        } else {

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
        console.log('🛡️ 开始安全性检查...');
        validMoves.forEach((move, index) => {
            const [row, col] = move;
            let isSafe = this.getSafetyScore(piece, row, col);
            
            // 🎯 特殊逻辑：如果红车有十字消除buff，重新评估"危险"位置
            if (!isSafe && piece.color === 'red' && piece.type === 'rook' && this.kingCaptured) {
                isSafe = this.isPositionSafeWithCrossElimination(piece, row, col);
                if (isSafe) {
                    console.log(`位置(${row},${col}): 十字消除后安全✨`);
                } else {
                    console.log(`位置(${row},${col}): 即使十字消除也危险❌`);
                }
            } else {
                console.log(`位置(${row},${col}): ${isSafe ? '安全✅' : '危险❌'}`);
            }
            
            if (isSafe) {
                safeMoves.push({move, index});
            }
        });

        if (safeMoves.length === 0) {
            return -1;
        }

        // 在安全移动中计算最佳落点
        console.log('🔍 开始分析十字消除最佳落点...');
        safeMoves.forEach(({move, index}) => {
            const [row, col] = move;
            let score = 0;
            let debugInfo = `位置(${row},${col}): `;
            
            // 1. 吃子价值评估（最高优先级）
            const targetPiece = this.board.getPieceAt(row, col);
            if (targetPiece && targetPiece.color !== piece.color) {
                let captureScore = this.getPieceValue(targetPiece.type) * 1000;
                
                // 🎯 重要棋子直接吃子加成：炮、车、将等高价值目标
                if (targetPiece.type === 'cannon' || targetPiece.type === 'rook' || targetPiece.type === 'king') {
                    captureScore *= 1.3; // 30%加成，确保直接吃子优于十字消除
                }
                
                score += captureScore;
                debugInfo += `吃${targetPiece.type}(+${captureScore}) `;
                
                // 吃子时也要考虑位置战术价值，作为同等吃子的tie-breaker
                const positionBonus = this.getPositionalValue(piece, row, col);
                score += positionBonus; // 位置加成帮助区分相同吃子价值
                debugInfo += `位置加成(+${positionBonus}) `;
            } else {
                // 2. 位置战术价值评估（无吃子时的次优选择）
                const positionScore = this.getPositionalValue(piece, row, col);
                score += positionScore;
                debugInfo += `位置价值(+${positionScore}) `;
            }
            
            // 3. 十字消除buff评估（如果红车有十字消除状态）
            if (piece.color === 'red' && piece.type === 'rook' && this.kingCaptured) {
                const eliminationValue = this.evaluateCrossEliminationValue(row, col);
                score += eliminationValue;
                debugInfo += `十字消除(+${eliminationValue}) `;
            }
            
            debugInfo += `= 总分:${score}`;
            console.log(debugInfo);
            
            if (score > bestScore) {
                bestScore = score;
                bestMoveIndex = index;
            }
        });
        
        const bestMove = safeMoves.find(({move, index}) => index === bestMoveIndex);
        console.log(`🎯 最佳选择: 位置(${bestMove?.move[0]},${bestMove?.move[1]}) (得分:${bestScore})`);
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
        let debugInfo = `位置(${row},${col})价值分析: `;
        
        // 1. 逃生路线评估 - 基础生存能力，但权重大幅降低
        const escapeRoutes = this.countEscapeRoutes(row, col);
        const escapeValue = Math.min(escapeRoutes * 0.1, 0.5); // 大幅降低权重，最高0.5分
        value += escapeValue;
        debugInfo += `逃生(+${escapeValue.toFixed(1)}) `;
        
        // 2. 攻击威胁评估 - 当前攻击价值
        const attackTargets = this.countAttackableEnemies(piece, row, col);
        const highValueTargets = this.countHighValueTargets(piece, row, col);
        
        let attackValue = 0;
        if (attackTargets >= 2) {
            // 多重威胁（叉攻）- 但要确保是真威胁，不是虚假威胁
            attackValue = Math.floor(attackTargets * 12); // 提高多重威胁奖励
        } else if (attackTargets >= 0.8) {
            // 真威胁 - 即使是单一目标也给予较高分数
            attackValue = Math.floor(attackTargets * 8); // 提高单一真威胁奖励
        } else if (attackTargets > 0) {
            // 虚假威胁 - 给予少量分数，但不为零（可能有位置价值）
            attackValue = 1;
        }
        value += attackValue;
        debugInfo += `攻击威胁(+${attackValue})[威胁值:${attackTargets.toFixed(2)}] `;
        
        // 2.5. 双重威胁奖励 - 多目标攻击的额外战术价值
        let multiTargetBonus = 0;
        if (attackTargets > 1.0) { // 进一步降低门槛，只要超过单一威胁就给奖励
            multiTargetBonus = Math.ceil((attackTargets - 1) * 10); // 提高系数到10，用ceil确保至少1分
            value += multiTargetBonus;
            debugInfo += `双重威胁奖励(+${multiTargetBonus}) `;
        }
        
        // 🎯 高价值目标威胁加成 - 单一威胁容易被逃脱，权重很低
        let highValueBonus = 0;
        if (highValueTargets > 0) {
            highValueBonus = highValueTargets * 2; // 从10进一步降低到2，因为容易逃脱
        }
        value += highValueBonus;
        debugInfo += `高价值目标(+${highValueBonus}) `;
        
        // 4. 下一轮最佳潜力评估 - 改进后的现实评估
        const nextRoundBest = this.evaluateNextRoundBestMove(piece, row, col);
        const nextRoundValue = Math.floor(nextRoundBest * 0.3);
        value += nextRoundValue;
        debugInfo += `下轮潜力(+${nextRoundValue}) `;
        
        // 5. 十字消除状态加成 - 如果有buff，提升位置价值
        let eliminationBonus = 0;
        if (this.kingCaptured) {
            eliminationBonus = this.evaluateCrossEliminationPositionBonus(row, col);
            value += eliminationBonus;
            debugInfo += `十字消除加成(+${eliminationBonus}) `;
        }
        
        console.log(debugInfo + `= 总位置分:${value}`);
        return value;
    }
    
    // 评估下一轮最佳移动潜力（深度递归分析）
    evaluateNextRoundBestMove(piece, row, col) {
        // 改进版本：考虑黑棋可以逃跑的现实情况，但大幅简化计算
        
        let nextRoundValue = 0;
        let debugInfo = `位置(${row},${col})威胁分析: `;
        
        // 1. 从目标位置出发，计算车的潜在移动价值
        const directions = [[0,1], [0,-1], [1,0], [-1,0]]; // 车的四个方向
        
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            // 只检查第一个遇到的棋子，不累积空格价值
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                const targetPiece = this.board.getPieceAt(r, c);
                
                if (targetPiece) {
                    if (targetPiece.color === 'black') {
                        // 🎯 简化威胁评估：只考虑棋子基础价值
                        const pieceValue = this.getPieceValue(targetPiece.type);
                        
                        // 统一威胁评估，与countAttackableEnemies保持一致
                        const threatValue = this.evaluateThreatValue(piece, row, col, r, c);
                        if (targetPiece.type === 'king') {
                            nextRoundValue += threatValue * 5; // 将 - 最高优先级
                            debugInfo += `威胁将(+${threatValue * 5}) `;
                        } else if (targetPiece.type === 'cannon' || targetPiece.type === 'rook') {
                            nextRoundValue += threatValue * 3; // 重要棋子
                            debugInfo += `威胁${targetPiece.type}(+${threatValue * 3}) `;
                        } else if (targetPiece.type === 'knight') {
                            nextRoundValue += threatValue * 2; // 马也是重要目标
                            debugInfo += `威胁${targetPiece.type}(+${threatValue * 2}) `;
                        } else {
                            nextRoundValue += threatValue * 1; // 其他棋子
                            debugInfo += `威胁${targetPiece.type}(+${threatValue * 1}) `;
                        }
                    }
                    break; // 遇到棋子停止
                }
                
                r += dr;
                c += dc;
            }
        }
        
        console.log(debugInfo + `总威胁分:${nextRoundValue}`);
        return nextRoundValue; // 直接返回，不再进一步降低
    }

    // 计算可威胁的高价值敌方棋子数量
    countHighValueTargets(piece, row, col) {
        let count = 0;
        const directions = [[0,1], [0,-1], [1,0], [-1,0]]; // 车的四个方向
        
        for (const [dr, dc] of directions) {
            let r = row + dr;
            let c = col + dc;
            
            // 沿直线查找第一个棋子
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                const targetPiece = this.board.getPieceAt(r, c);
                
                if (targetPiece) {
                    // 如果是敌方高价值棋子
                    if (targetPiece.color !== piece.color) {
                        if (targetPiece.type === 'king' || 
                            targetPiece.type === 'rook' || 
                            targetPiece.type === 'cannon') {
                            count++;
                        }
                    }
                    break; // 遇到任何棋子都停止
                }
                
                r += dr;
                c += dc;
            }
        }
        
        return count;
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

    // 计算棋子周围的逃脱空间数量
    countEscapeSpaces(row, col) {
        let escapeSpaces = 0;
        const directions = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]]; // 八个方向
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            // 检查是否在边界内且为空位置
            if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 8) {
                if (!this.board.getPieceAt(newRow, newCol)) {
                    escapeSpaces++;
                }
            }
        }
        
        return escapeSpaces;
    }

    // 计算可攻击的敌方棋子数量（专为红车优化，区分真威胁和虚假威胁）
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
                
                // 分析这个方向的威胁情况，重点检查吃子安全性
                if (foundEnemies.length === 1) {
                    // 单个敌方棋子，检查是否为真威胁
                    const enemy = foundEnemies[0];
                    const threatValue = this.evaluateThreatValue(piece, row, col, enemy.pos[0], enemy.pos[1]);
                    count += threatValue;
                    if (threatValue > 0) {
                        threatenedPieces.push(`${enemy.piece.type}(${enemy.pos[0]},${enemy.pos[1]})`);
                    }
                } else if (foundEnemies.length >= 2) {
                    // 多个敌方棋子，只有第一个可以直接吃
                    const firstEnemy = foundEnemies[0];
                    const threatValue = this.evaluateThreatValue(piece, row, col, firstEnemy.pos[0], firstEnemy.pos[1]);
                    count += threatValue;
                    if (threatValue > 0) {
                        threatenedPieces.push(`${firstEnemy.piece.type}(${firstEnemy.pos[0]},${firstEnemy.pos[1]})`);
                    }
                    
                    // 后续棋子算作潜在威胁，但权重很低
                    for (let i = 1; i < Math.min(foundEnemies.length, 3); i++) {
                        count += 0.2; // 潜在威胁只算0.2分
                    }
                }
            }
        }
        
        return count;
    }
    
    // 评估威胁价值（区分真威胁和虚假威胁）
    evaluateThreatValue(attackerPiece, attackerRow, attackerCol, targetRow, targetCol) {
        // 1. 检查目标是否受保护
        const isProtected = this.isPositionProtected(targetRow, targetCol, 'black');
        const targetPiece = this.board.getPieceAt(targetRow, targetCol);
        
        if (!isProtected) {
            // 目标未受保护，这是真威胁 - 可以安全吃子
            console.log(`真威胁: ${targetPiece?.type}(${targetRow},${targetCol}) 未受保护`);
            return 1.0; // 完整威胁价值
        } else {
            // 目标受保护，红车吃子后会被反杀 - 这是虚假威胁
            // 红车是唯一棋子，被吃掉就游戏结束，绝对不能冒险
            console.log(`虚假威胁: ${targetPiece?.type}(${targetRow},${targetCol}) 受保护`);
            return 0.05; // 几乎无价值的虚假威胁
        }
    }
    
    // 检查位置是否被保护（有己方棋子能吃掉攻击者）
    isPositionProtected(row, col, defenderColor) {
        // 检查是否有同色棋子能攻击到这个位置
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 8; c++) {
                const protectorPiece = this.board.getPieceAt(r, c);
                if (protectorPiece && protectorPiece.color === defenderColor) {
                    // 跳过目标位置本身
                    if (r === row && c === col) continue;
                    
                    // 检查这个棋子是否能保护目标位置
                    if (this.canPieceAttack(protectorPiece, r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
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
    
    // 评估有十字消除buff时位置是否安全
    isPositionSafeWithCrossElimination(piece, row, col) {
        // 临时移除当前棋子
        const originalPiece = this.board.getPieceAt(piece.position[0], piece.position[1]);
        this.board.setPieceAt(piece.position[0], piece.position[1], null);
        
        // 模拟十字消除：临时移除十字方向上的所有黑棋
        const eliminatedPieces = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
        
        directions.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;
            
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                const targetPiece = this.board.getPieceAt(r, c);
                if (targetPiece && targetPiece.color === 'black') {
                    // 记录被消除的黑棋，稍后恢复
                    eliminatedPieces.push({piece: targetPiece, position: [r, c]});
                    this.board.setPieceAt(r, c, null);
                }
                r += dr;
                c += dc;
            }
        });
        
        // 检查消除后目标位置是否还会被攻击
        const isUnderAttack = this.isPositionUnderAttack(row, col, piece.color);
        
        // 恢复被消除的黑棋
        eliminatedPieces.forEach(({piece: eliminatedPiece, position}) => {
            this.board.setPieceAt(position[0], position[1], eliminatedPiece);
        });
        
        // 恢复原来的红车
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
                    
                    // 检查蹩马腿 - 马走L型时被阻挡的位置
                    if (Math.abs(pieceRow - targetRow) === 1 && Math.abs(pieceCol - targetCol) === 2) {
                        // 横向走2格，竖向走1格的情况
                        const blockCol = pieceCol + (targetCol > pieceCol ? 1 : -1);
                        return !this.board.getPieceAt(pieceRow, blockCol);
                    } else {
                        // 竖向走2格，横向走1格的情况  
                        const blockRow = pieceRow + (targetRow > pieceRow ? 1 : -1);
                        return !this.board.getPieceAt(blockRow, pieceCol);
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
    
    // 评估十字消除的价值（当红车有消除buff时）
    evaluateCrossEliminationValue(row, col) {
        let eliminationValue = 0;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
        
        // 计算十字方向上能消除的黑棋价值
        directions.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;
            
            // 沿直线计算所有能消除的黑棋
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                const piece = this.board.getPieceAt(r, c);
                if (piece && piece.color === 'black') {
                    // 十字消除的价值是正常吃子价值的70%（因为是群体消除）
                    eliminationValue += this.getPieceValue(piece.type) * 700;
                }
                r += dr;
                c += dc;
            }
        });
        
        return eliminationValue;
    }
    
    // 评估十字消除状态下的位置加成
    evaluateCrossEliminationPositionBonus(row, col) {
        let bonus = 0;
        
        // 1. 中心位置奖励 - 十字消除从中心效果更好
        const centerDistance = Math.abs(row - 4) + Math.abs(col - 3.5);
        bonus += Math.max(0, 20 - centerDistance * 3); // 中心最高20分
        
        // 2. 消除覆盖范围奖励
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let totalCoverage = 0;
        
        directions.forEach(([dr, dc]) => {
            let r = row + dr;
            let c = col + dc;
            let coverage = 0;
            
            // 计算这个方向的覆盖范围
            while (r >= 0 && r < 9 && c >= 0 && c < 8) {
                coverage++;
                r += dr;
                c += dc;
            }
            totalCoverage += coverage;
        });
        
        // 覆盖范围越大，位置价值越高
        bonus += totalCoverage * 2;
        
        // 3. 十字消除状态下避开边角的额外惩罚
        if ((row === 0 || row === 8) && (col === 0 || col === 7)) {
            bonus -= 30; // 角落位置十字消除效果差
        } else if (row === 0 || row === 8 || col === 0 || col === 7) {
            bonus -= 10; // 边线位置也要减分
        }
        
        return bonus;
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

        }
    }
}