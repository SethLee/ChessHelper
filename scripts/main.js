// ChessGame - 主入口文件

// 全局游戏实例
let chessGame;

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    console.log('ChessGame 开始加载...');
    
    try {
        // 创建游戏实例
        chessGame = new ChessGame();
        
        // 初始化游戏界面
        chessGame.initializeUI();
        
        console.log('ChessGame 初始化完成！');
        
        // 初始化完成
        
    } catch (error) {
        console.error('游戏初始化失败:', error);
        console.error('游戏初始化失败，请刷新页面重试。');
    }
});





// 防止右键菜单（可选）
document.addEventListener('contextmenu', function(event) {
    if (event.target.closest('.chessboard')) {
        event.preventDefault();
    }
});

// 窗口大小改变时的响应（可选）
window.addEventListener('resize', function() {
    // 这里可以添加响应式布局的处理代码
    console.log('窗口大小已改变');
});

// 游戏统计功能（可选扩展）
const GameStats = {
    gamesPlayed: 0,
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
    
    // 从localStorage加载统计数据
    load() {
        const stats = localStorage.getItem('chessGameStats');
        if (stats) {
            Object.assign(this, JSON.parse(stats));
        }
    },
    
    // 保存统计数据到localStorage
    save() {
        localStorage.setItem('chessGameStats', JSON.stringify({
            gamesPlayed: this.gamesPlayed,
            whiteWins: this.whiteWins,
            blackWins: this.blackWins,
            draws: this.draws
        }));
    },
    
    // 记录游戏结果
    recordGame(result) {
        this.gamesPlayed++;
        switch (result) {
            case 'white':
                this.whiteWins++;
                break;
            case 'black':
                this.blackWins++;
                break;
            case 'draw':
                this.draws++;
                break;
        }
        this.save();
    },
    
    // 获取统计信息
    getStats() {
        return {
            total: this.gamesPlayed,
            whiteWins: this.whiteWins,
            blackWins: this.blackWins,
            draws: this.draws
        };
    }
};

// 加载游戏统计
GameStats.load();

// 导出全局函数供调试使用
window.ChessGameDebug = {
    getGame: () => chessGame,
    getBoard: () => chessGame ? chessGame.board : null,
    getStats: () => GameStats.getStats(),
    resetStats: () => {
        Object.assign(GameStats, { gamesPlayed: 0, whiteWins: 0, blackWins: 0, draws: 0 });
        GameStats.save();
    }
};

console.log('ChessGame 主文件加载完成！');