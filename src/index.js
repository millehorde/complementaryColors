import Worker from './network.worker.js';
import colorHelper from './colorHelper';
const appendPrediction = (input, target, predicted, cost, accuracy) => {
    input = 'rgb(' + input.join(',') + ')';
    target = 'rgb(' + target.join(',') + ')';
    predicted = 'rgb('+ predicted.join(',')+')';

    const predictionHTML = `<tr>
        <td>${currentIteration}</td>
        <td class="box" style="background-color: ${input}">${input}</td>
        <td class="box" style="background-color: ${target}">${target}</td>
        <td class="box" style="background-color: ${predicted}">${predicted}</td>
        <td style="color: ${cost.color}">${cost.value.toFixed(5)}</td>
        <td style="color: ${accuracy.color}">${accuracy.value.toFixed(4)}</td>
    </tr>`;

    const tbody = document.getElementById('predictionBody');
    tbody.insertAdjacentHTML( 'beforeend', predictionHTML);
};

const hexToRgb = (color) => {
  if(color.substring(0,1) === '#') {
    color = color.substring(1);
  }
  let rgbColor = [];
  rgbColor.push(parseInt(color.substring(0,2),16));
  rgbColor.push(parseInt(color.substring(2,4),16));
  rgbColor.push(parseInt(color.substring(4),16));
  return rgbColor;
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

let iterations;
let epochs;
let currentIteration = 0;
let lastCost = 1;
let lastAccurcay = 0;

if (window.Worker) {
    let shouldTrain;
    const worker = new Worker();
    const inputColor = [222, 165, 255];

    //emit predict event
    document.getElementById("predict").onclick = function(){
      const inputColor2 = hexToRgb(document.getElementById("topredict").value);
      worker.postMessage(['predict', inputColor2]);
    };

    //emit reset event
    document.getElementById("reset").onclick = function() {
        document.getElementById('predictionBody').innerHTML = '';
        currentIteration = 0;
        lastCost = 1;
        lastAccurcay = 0;
        
        worker.postMessage('reset');
    };

    //emit start event
    document.getElementById("start").onclick = function() {
      document.getElementById('predictionBody').innerHTML = '';
        epochs = parseInt(document.getElementById("epochs").value);
        
        const configuration = {
            learningRate: parseFloat(document.getElementById("learningRate").value),
            trainingData: parseInt(document.getElementById("trainingData").value),
            batchSize: parseInt(document.getElementById("batchSize").value),
            epochs: epochs,
        };
        iterations = parseInt(document.getElementById("iterations").value);
        worker.postMessage([configuration, inputColor]);
        shouldTrain = true;
    };

    //emit stop event
    document.getElementById("stop").onclick = function() {
        shouldTrain = false;
    };

    //Catch worker answer
    worker.onmessage = function (e) {
        if(e.data.predict){
          let predictedColor = rgbToHex(e.data.prediction[0], e.data.prediction[1], e.data.prediction[2])
          console.log(`color predicted is ${predictedColor}, computed from color ${document.getElementById("topredict").value}`);
          document.getElementById('predicted').value = predictedColor;
          return;
        }
        let inputColor = e.data.input;
        const prediction = e.data.prediction;
        const cost = {
            value: e.data.loss,
        };
        cost.color = (cost.value <= lastCost) ? 'green' : 'red';
        lastCost = cost.value;
        const accuracy = {
            value: e.data.accuracy,
        };
        accuracy.color = (accuracy.value >= lastAccurcay) ? 'green' : 'red';
        lastAccurcay = accuracy.value;

        appendPrediction(inputColor, colorHelper.computeComplementaryColor(inputColor), prediction, cost, accuracy);

        if (currentIteration < iterations && shouldTrain) {
            console.log('continue training');
            currentIteration++;
            worker.postMessage([false, inputColor]);
        }else{
          currentIteration = 0;
        }
    };
}
