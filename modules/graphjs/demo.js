function loadJson(filepath, callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open('GET', filepath, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == "200") {
            callback(xhr.responseText);
        }
    };
    xhr.send(null);
}

// loadJson("btc.json", function(text) {
//     var data = JSON.parse(text);
//     console.log(data);
// });

sample_dict = [
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

const canvas = document.getElementById('barchart');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#4c566a';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = '#eceff4';

// Draw X axis
ctx.beginPath();
ctx.moveTo(50, canvas.height - 50);
ctx.lineTo(canvas.width - 50, canvas.height - 50);
ctx.stroke();

// Draw Y axis
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(50, canvas.height - 50);
ctx.stroke();

// Add axis labels
ctx.font = '12px Arial';
ctx.textAlign = 'center';
ctx.fillText('Time', canvas.width / 2, canvas.height - 20);

ctx.textAlign = 'right';
ctx.textBaseline = 'middle';
ctx.fillText('Value', 30, canvas.height / 2);

first_value = sample_dict[0]
last_value = sample_dict[sample_dict.length - 1]

min_x = first_value['x']
max_x = last_value['x']

min_y = first_value['y']
max_y = last_value['y']

x_range = max_x - min_x
y_range = max_y - min_y

prev_x = null
prev_y = null
for (let i = 0; i < sample_dict.length; i++) {
    let point = sample_dict[i];
    let x = 60 + ((point['x'] - min_x) / x_range) * (canvas.width - 100);
    let y = canvas.height - 60 - ((point['y'] - min_y) / y_range) * (canvas.height - 100);
    if (prev_x !== null && prev_y !== null) {
        ctx.beginPath();
        ctx.moveTo(prev_x, prev_y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    prev_x = x;
    prev_y = y;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}


