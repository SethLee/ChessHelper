// ChessHelper - 主入口文件

// 全局分析实例
let chessHelper;

// 页面加载完成后初始化分析工具
document.addEventListener('DOMContentLoaded', function() {

    
    try {
        // 创建分析实例
        chessHelper = new ChessHelper();
        
        // 初始化分析界面
        chessHelper.initializeUI();
        

        
        // 初始化完成
        
    } catch (error) {
        console.error('分析工具初始化失败:', error);
        console.error('分析工具初始化失败，请刷新页面重试。');
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

});

// 分析统计功能（可选扩展）
const GameStats = {
    gamesPlayed: 0,
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
    
    // 从localStorage加载统计数据
    load() {
        const stats = localStorage.getItem('chessHelperStats');
        if (stats) {
            Object.assign(this, JSON.parse(stats));
        }
    },
    
    // 保存统计数据到localStorage
    save() {
        localStorage.setItem('chessHelperStats', JSON.stringify({
            gamesPlayed: this.gamesPlayed,
            whiteWins: this.whiteWins,
            blackWins: this.blackWins,
            draws: this.draws
        }));
    },
    
    // 记录分析结果
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

// 加载分析统计
GameStats.load();

// 导出全局函数供调试使用
window.ChessHelperDebug = {
    getGame: () => chessHelper,
    getBoard: () => chessHelper ? chessHelper.board : null,
    getStats: () => GameStats.getStats(),
    resetStats: () => {
        Object.assign(GameStats, { gamesPlayed: 0, whiteWins: 0, blackWins: 0, draws: 0 });
        GameStats.save();
    }
};

