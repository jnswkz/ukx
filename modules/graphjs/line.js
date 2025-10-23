class linegraph{
    constructor(canvas, data, labels, backgroundcolor, linecolor){
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.font = '12px JetBrains Mono';
        this.data = data;
        this.labels = labels;
        this.backgroundcolor = backgroundcolor;
        this.linecolor = linecolor;
    }

    drawGraph(){
        // to do -- draw X and Y axis. labels

        // to do -- recognize data points and draw lines

    }
}

var sample_data = [
        {
            "x": 1728864000000,
            "y": 62842.66
        },
        {
            "x": 1728950400000,
            "y": 66048.56
        },
        {
            "x": 1729036800000,
            "y": 67049.57
        },
        {
            "x": 1729123200000,
            "y": 67599.32
        },
        {
            "x": 1729209600000,
            "y": 67401.64
        },
        {
            "x": 1729296000000,
            "y": 68426.2
        },
        {
            "x": 1729382400000,
            "y": 68365.74
        }
    ];