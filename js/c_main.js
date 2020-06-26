//tensorflow parameters
const inpMin = -1, inpMax = 1, normConst = (inpMax - inpMin)/255.0;
const input_shape = 224, topK = 3;
const radio_btns = document.getElementsByName('options');
const radio_btn_labels = document.getElementsByName('prediction_labels');
let modelReady = false;
let act_data;
let act_average;
let act_max;
let set_act_max = 36; 


const mainDisplayDiv = document.getElementById('mainDisplayDiv');
var video;
var takePhotoButton;
var toggleFullScreenButton;
var switchCameraButton;
var amountOfCameras = 0;
var currentFacingMode = 'environment';

// focus area side length 
let focus_side_length;
let focusCnv = document.getElementById('focusDiv');
let focusCtx = focusCnv.getContext('2d');

// focus area relative position regarding the screen 
let focus_center_x_p = 0.5; 
let focus_center_y_p = 0.4;

let videoWidth;
let videoHeight;

let focus_offset_x;
let focus_offset_y; 

// this function counts the amount of video inputs
function deviceCount() {
  return new Promise(function (resolve) {
    var videoInCount = 0;

    navigator.mediaDevices
      .enumerateDevices()
      .then(function (devices) {
        devices.forEach(function (device) {
          if (device.kind === 'video') {
            device.kind = 'videoinput';
          }

          if (device.kind === 'videoinput') {
            videoInCount++;
            console.log('videocam: ' + device.label);
          }
        });

        resolve(videoInCount);
      })
      .catch(function (err) {
        console.log(err.name + ': ' + err.message);
        resolve(0);
      });
  });
}

document.addEventListener('DOMContentLoaded', function (event) {
  // check if mediaDevices is supported
  if (
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      navigator.mediaDevices.enumerateDevices
  ) {
      // first we call getUserMedia to trigger permissions
      // we need this before deviceCount, otherwise Safari doesn't return all the cameras
      // we need to have the number in order to display the switch front/back button
      navigator.mediaDevices
      .getUserMedia({
          audio: false,
          video: true,
      })
      .then(function (stream) {
          stream.getTracks().forEach(function (track) {
          track.stop();
          });

          deviceCount().then(function (deviceCount) {
          amountOfCameras = deviceCount;

          // init the UI and the camera stream
          initCameraUI();
          initCameraStream();
          });
      })
      .catch(function (error) {
          //https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
          if (error === 'PermissionDeniedError') {
          alert('Permission denied. Please refresh and give permission.');
          }

          console.error('getUserMedia() error: ', error);
      });
  } else {
      alert(
      'Mobile camera is not supported by browser, or there is no camera detected/connected',
      );
  }

  init();

});

function initCameraUI() {
  video = document.getElementById('video');

  takePhotoButton = document.getElementById('takePhotoButton');
  toggleFullScreenButton = document.getElementById('toggleFullScreenButton');
  switchCameraButton = document.getElementById('switchCameraButton');

  // set camera focus rect size and position
  videoWidth = video.offsetWidth;
  videoHeight = video.offsetHeight;

  console.log("videoWidth: " + videoWidth);
  console.log("videoHeight: " + videoHeight);

  focus_side_length = Math.round(0.9 * videoWidth);
  console.log("focus area side width: " + focus_side_length);
  let focus_rect = document.getElementById("focus_rect");
  focus_rect.setAttribute("height", focus_side_length);
  focus_rect.setAttribute("width", focus_side_length);

  let x_val = focus_center_x_p*100 + '%';
  let y_val = focus_center_y_p*100 + '%';

  focus_rect.setAttribute("x", x_val);
  focus_rect.setAttribute("y", y_val);

  let t_val = 'translate(' + (-focus_side_length/2) + ' ' + (-focus_side_length/2) + ')';
  focus_rect.setAttribute("transform", t_val);

  // set canvas of activation vis location
  
  focusCnv.width = focus_side_length;
  focusCnv.height = focus_side_length;
  focusCnv.style.position = 'absolute';

  focus_offset_x = videoWidth * focus_center_x_p - focus_side_length/2;
  focus_offset_y = videoHeight * focus_center_y_p - focus_side_length/2;
  focusCnv.style.left = focus_offset_x;
  focusCnv.style.top = focus_offset_y;

}

function initCameraStream() {
  // stop any active streams in the window
  stopVideoStream();

  // we ask for a square resolution, it will cropped on top (landscape)
  // or cropped at the sides (landscape)
  // var size = 1280;

  var constraints = {
    audio: false,
    video: {
      // width: { ideal: size },
      // height: { ideal: size },
      width: { min: 0, ideal: window.innerWidth, max: 1920 },
      height: { min: 0, ideal: window.innerHeight, max: 1080 },
      facingMode: currentFacingMode,
    },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(handleSuccess)
    .catch(handleError);

  function handleSuccess(stream) {
    window.stream = stream; // make stream available to browser console
    video.srcObject = stream;

    // if (constraints.video.facingMode) {
    //   if (constraints.video.facingMode === 'environment') {
    //     switchCameraButton.setAttribute('aria-pressed', true);
    //   } else {
    //     switchCameraButton.setAttribute('aria-pressed', false);
    //   }
    // }

    const track = window.stream.getVideoTracks()[0];
    const settings = track.getSettings();
    str = JSON.stringify(settings, null, 4);
    console.log('settings ' + str);
  }

  function handleError(error) {
    console.error('getUserMedia() error: ', error);
  }
}

 async function takeSnapshot() {
  // if you'd like to show the canvas add it to the DOM
  var canvas = document.createElement('canvas');

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  canvas.className = 'displayTakenPhoto';
  canvas.setAttribute("id", "takenPhoto");

  context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, videoWidth, videoHeight);
  mainDisplayDiv.appendChild(canvas);

  stopVideoStream();
  document.getElementById('sliderDiv').className = 'slider';
  document.getElementById('takePhotoButton').style.visibility = "hidden";

  await classify();
}

function retakePhoto(){
  focusCtx.clearRect(0,0, focus_side_length,focus_side_length);
  document.getElementById('sliderDiv').className = 'slider closed';
  initCameraStream();  
  document.getElementById('takenPhoto').remove();
  document.getElementById('takePhotoButton').style.visibility = "visible";
}

function stopVideoStream(){
  if (window.stream) {
    window.stream.getTracks().forEach(function (track) {
      console.log(track);
      track.stop();
    });
  }
}

// CAM part
const init = async () => {
  await loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');
  console.log('model loaded');
}

async function loadLayersModel(modelUrl) {
  let ti = performance.now();
  mobilenet = await tf.loadLayersModel(modelUrl, {
    onProgress: (fraction) => {
      // document.getElementById('output').innerText = "loading progress " + fraction.toFixed(2);
    }
  });
  console.log('model loaded ' + Math.round(performance.now() - ti) + ' ms');
  // document.getElementById('output').innerText = "Model is loaded!";
  const layer = mobilenet.getLayer('conv_pw_13_relu');
  baseModel = tf.model({inputs: mobilenet.inputs, outputs: layer.output});

  const layerPred = await mobilenet.getLayer('conv_preds');
//  const weight985 = layerPred.getWeights()[0].slice([0,0,0,985],[1,1,-1,1]);
  weightsPred = layerPred.getWeights()[0];
  // makeModel(index);
}
async function makeModel(ind) {
  if(modelReady) model.dispose();
  modelReady = true;
  const weightInd = weightsPred.slice([0,0,0, parseInt(ind)],[1,1,-1,1]);
  model = tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [7,7,1024],  filters: 1,  kernelSize: 1,
        useBias: false, weights: [weightInd]
      })
    ]
  });
}

function rect(){

  let canvas = document.createElement('canvas');
  let context = canvas.getContext('2d');
  let img = document.getElementById('takenPhoto');
  canvas.width = focus_side_length;
  canvas.height = focus_side_length;
  console.log(focus_offset_x);
  console.log(focus_offset_y);

  context.drawImage(img, focus_offset_x, focus_offset_y, focus_side_length,focus_side_length, 0, 0, input_shape, input_shape);
  var imgData = context.getImageData(0, 0, input_shape, input_shape);
  return imgData;
}

async function classify() {
  let imgData = rect();
  const batched = tf.tidy( () => {
    const image = tf.browser.fromPixels(imgData);
    const normalized = image.toFloat().mul(normConst).add(inpMin);
    return normalized.reshape([-1, input_shape, input_shape, 3]);
  });
  const softmax = mobilenet.predict(batched);
  const predictions = await getTopKClassesKeras(softmax, topK);
  
  let str = "I think it is a:";
  // for(let i=0; i<topK; i++)
  //   str += "\n" + predictions[i].probability.toFixed(3) + " - " + predictions[i].classInd +
  //     " - " + predictions[i].className;
  // document.getElementById('output').innerText = str;
  
  //toggle buttons for classify objects
  for(let i = 0; i < radio_btns.length; i++) {
    radio_btns[i].value = predictions[i].classInd;
    radio_btn_labels[i].innerText = predictions[i].className + " - " + (predictions[i].probability * 100).toFixed(1) + "%";
  }

  let radio_btn_ind = check_radio_Index();
  makeModel(predictions[radio_btn_ind].classInd);

  const basePredict = baseModel.predict(batched);
  const predicted = model.predict(basePredict);
  act_data = predicted.dataSync();

  basePredict.dispose();
  predicted.dispose();
  let ma = act_data[0], sum = ma;
  // cacluate the max activation and average activation 
  for(let i = 1; i < 49; i++ ){
    let di = act_data[i];
    sum += di;

    // cacluate the max activation
    if(ma < di)  ma = di;
  }
  act_max = ma;
  act_average = sum/49;
  console.log("max= " + act_max.toFixed(2) + ", av= " + act_average.toFixed(2));

  drawSquare();
}

function drawSquare() {

  let k = 0;
  focusCtx.clearRect(0,0, focus_side_length,focus_side_length);
  let m = focus_side_length/7;
  for(let i=0; i < 7; i++){
    for (let j=0; j < 7; j++, k++){
      focusCtx.beginPath();
      focusCtx.rect([j]*m, [i]*m, m, m);
      // let alpha = Math.max((1 - Math.exp(0.095*(act_data[k] - set_act_max))), 0);
      let alpha = Math.max((1 - Math.exp(0.035*(-act_data[k] + set_act_max))), 0);
      focusCtx.fillStyle = 'rgba(255, 0, 0  ,' + alpha + ')';
      // out_ctx3.fillStyle = 'rgba(82, 97, 110  ,' + alpha + ')';
      focusCtx.fill();
    }
  }
  console.log("set_act_max: " + set_act_max);
}

function check_radio_Index(){
  for (let i=0; i < radio_btns.length; i ++){
    if (radio_btns[i].checked){
      return i;
    }
  }
}