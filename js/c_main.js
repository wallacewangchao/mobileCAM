//tensorflow parameters
const inpMin = -1, inpMax = 1, normConst = (inpMax - inpMin)/255.0;
const input_shape = 224, topK = 3;
let modelReady = false;
let act_data;
let act_average;
let act_max;
let set_act_max = 50 - 40; //range max value - range default value  
const arrSum = arr => arr.reduce((a,b) => a + b, 0)
let actDraw_val = new Array(49);
let touchedDraw_val = new Array(49).fill(0);

const radio_btns = document.getElementsByName('options');
const radio_btn_labels = document.getElementsByName('prediction_labels');
const mainDisplayDiv = document.getElementById('mainDisplayDiv');
const hint_text = document.getElementById('hint_text');
const takePhotoButton = document.getElementById('takePhotoButton');
const firstPageBtnsDiv = document.getElementById('firstPageBtnsDiv');
const modeSwitch = document.getElementById('modeSwitch');
const compareBtn = document.getElementById('compareBtn');
const slider_actMax = document.getElementById('slider_actMax');
const touch_Cnv = document.getElementById('touchCnv');
const touch_Ctx = touch_Cnv.getContext('2d');
const one_preResult = document.getElementById('one_preResult');
const toggle_btns = document.getElementById('toggle_btns');
const retakeButton = document.getElementById('retakeButton');

let video;
let orginVideoHeight = 1280;
let amountOfCameras = 0;
let currentFacingMode = 'environment';

// focus area side length 
let focus_side_length;
let focusCnv = document.getElementById('focusDiv');
let focusCtx = focusCnv.getContext('2d');

// focus area relative position regarding the screen 
let focus_center_x_p = 0.5; 
let focus_center_y_p = 0.4;

let screenWidth;
let screenHeight;

let focus_offset_x;
let focus_offset_y; 

let myTouchDraw;

document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

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
      'Mobile camera is not supported by browser, please use Safari or Chrome to open the page',
      );
  }

  load_model();

});

function initCameraUI() {
  video = document.getElementById('video');
  video.style.position = "absolute";

  // set camera focus rect size and position
  screenWidth = video.offsetWidth;
  screenHeight = video.offsetHeight;

  console.log("screenWidth: " + screenWidth);
  console.log("screenHeight: " + screenHeight);

  focus_side_length = Math.round(0.9 * screenWidth);
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
  focus_offset_x = screenWidth * focus_center_x_p - focus_side_length/2;
  focus_offset_y = screenHeight * focus_center_y_p - focus_side_length/2;
  setFocusCanvasPos(focusCnv);
  console.log("focus_offset_y:" + focus_offset_y);
  
  // set hint text position
  hint_text.style.top =  (focus_offset_y - 30) + 'px';
  hint_text.innerHTML = 'Take a photo of an object';

  myTouchDraw = new touchDrawRect(touch_Ctx);
}

function initCameraStream() {
  // stop any active streams in the window
  stopVideoStream();

  // we ask for a square resolution, it will cropped on top (landscape)
  // or cropped at the sides (landscape)
  var constraints = {
    audio: false,
    video: {
      width: { ideal: window.innerWidth },
      height: { ideal: window.innerHeight },
      // width: { min: 0, ideal: window.innerWidth, max: 1920 },
      // height: { min: 0, ideal: window.innerHeight, max: 1080 },
      facingMode: 'environment',
    },
  };

  window.screen.availHeight = 

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(handleSuccess)
    .catch(handleError);

  function handleSuccess(stream) {
    window.stream = stream; // make stream available to browser console
    video.srcObject = stream;

    const track = window.stream.getVideoTracks()[0];
    const settings = track.getSettings();
    str = JSON.stringify(settings, null, 4);
    // console.log('settings ' + str);
  }

  function handleError(error) {
    console.error('getUserMedia() error: ', error);
  }
}

async function takeSnapshot() {
  // if you'd like to show the canvas add it to the DOM
  var canvas = document.createElement('canvas');

  canvas.width = screenWidth;
  canvas.height = screenHeight;

  canvas.className = 'displayTakenPhoto';
  canvas.setAttribute("id", "takenPhoto");
  context = canvas.getContext('2d');

  // make canvas to draw cropped image of video according to the screen size. 
  
  let orginVideoWidth = orginVideoHeight;
  s_height = orginVideoHeight;
  s_width = s_height * screenWidth/screenHeight; 
  s_x = orginVideoWidth/2 - s_width/2

  // context.drawImage(video, s_x, 0, s_width, s_height, 0, 0, screenWidth, screenHeight);
  context.drawImage(video, 0, 0);

  mainDisplayDiv.appendChild(canvas);

  stopVideoStream();
  document.getElementById('sliderDiv').className = 'slider';
  firstPageBtnsDiv.style.display = "none";


  // sound feedback
  var sndClick = new Howl({ src: ['snd/beep.mp3'] });
  sndClick.play();
  // checke video button
  if(modeSwitch.checked){
    compareBtn.style.display = "";
    compareBtn.innerHTML = 'compare';
    compareBtn.disabled = false;
    hint_text.innerText = 'please scribble the areas that AI focuses'
    slider_actMax.style.display = "none";
    createTouchListener();
    set_act_max = 50;
    touchedDraw_val.fill(0);
    actDraw_val.fill(0);
  }else{
    compareBtn.style.display = "none";
    hint_text.innerHTML = "Red areas are AI's focus";
    slider_actMax.style.display = "";
    set_act_max = 50 - 40;
  }

  await classify();
}

function retakePhoto(){
  focusCtx.clearRect(0,0, focus_side_length,focus_side_length);
  document.getElementById('sliderDiv').className = 'slider closed';
  initCameraStream();  
  document.getElementById('takenPhoto').remove();
  firstPageBtnsDiv.style.display = "";
  hint_text.innerHTML = "Take a photo of an object"
  touch_Ctx.clearRect(0, 0, focus_side_length, focus_side_length);

  removeTouchListener();
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
const load_model = async () => {
  takePhotoButton.disabled = true;
  await loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');
}

async function loadLayersModel(modelUrl) {
  let ti = performance.now();
  mobilenet = await tf.loadLayersModel(modelUrl, {
    onProgress: (fraction) => {
      hint_text.innerText = "loading model " + (fraction*100).toFixed(1) + "%";
    }
  });
  console.log('model loaded ' + Math.round(performance.now() - ti) + ' ms');
  hint_text.innerHTML = "Take a photo of an object";
  takePhotoButton.disabled = false;

  const layer = mobilenet.getLayer('conv_pw_13_relu');
  baseModel = tf.model({inputs: mobilenet.inputs, outputs: layer.output});

  const layerPred = await mobilenet.getLayer('conv_preds');
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
  
  let target_pred;
  //toggle buttons for classify objects
  if(!modeSwitch.checked){
    toggle_btns.style.display = "";
    one_preResult.style.display = "none";
    for(let i = 0; i < radio_btns.length; i++) {
      radio_btns[i].value = predictions[i].classInd;
      let className = predictions[i].className;
      let firstName = className.split(',')[0];
      radio_btn_labels[i].innerText = firstName + " - " + (predictions[i].probability * 100).toFixed(1) + "%";
    }
    target_pred = check_radio_Index();
  } 
  else{
    toggle_btns.style.display = "none";
    one_preResult.style.display = "";
    let className = predictions[0].className;
    one_preResult.innerHTML  = className + " <br/> " + (predictions[0].probability * 100).toFixed(1) + "%"
    target_pred = 0;
  }

  makeModel(predictions[target_pred].classInd);
  const basePredict = baseModel.predict(batched);
  const predicted = model.predict(basePredict);
  act_data = predicted.dataSync();
  basePredict.dispose();
  predicted.dispose();
  if(!modeSwitch.checked){
    drawSquare();
  }

}

function drawSquare() {
  let k = 0;
  focusCtx.clearRect(0,0, focus_side_length,focus_side_length);
  let m = focus_side_length/7;
  for(let i=0; i < 7; i++){
    for (let j=0; j < 7; j++, k++){
      focusCtx.beginPath();
      focusCtx.rect([j]*m, [i]*m, m, m);
      // let alpha = Math.max((1 - Math.exp(0.035*(-act_data[k] + set_act_max))), 0);
      let alpha = Math.max((1 - Math.exp(0.035*(set_act_max - act_data[k]))), 0);
      focusCtx.fillStyle = 'rgba(255, 0, 0  ,' + alpha + ')';
      focusCtx.fill();
      actDraw_val[k] = alpha; 
    }
  }
  // console.log("set_act_max: " + set_act_max);
  // console.log("actDraw_val: " + actDraw_val);

}

function check_radio_Index(){
  for (let i=0; i < radio_btns.length; i ++){
    if (radio_btns[i].checked){
      return i;
    }
  }
}


// TODO: adding compare sound effect
// TODO: shorten time interval when act_val is 0
function compare(){
  let oneShot = setInterval(iteration, 30);
  function iteration(){
    compareBtn.disabled = true;
    retakeButton.disabled = true;
    hint_text.innerText = 'check your score!'
    removeTouchListener();
    let sum_touched_val = arrSum(touchedDraw_val);
    let sum_act_val = arrSum(actDraw_val);
    // console.log("sum_touched_val: " + sum_touched_val + "   sum_act_val: " + sum_act_val);

    if((sum_act_val <= sum_touched_val) && (set_act_max >=0)){
      set_act_max -= 1;
      drawSquare();
      compareBtn.innerHTML = "Your Score:  " + cal_score(sum_act_val,sum_act_val);
    }else{
      clearInterval(oneShot);
      // ) :( :D :* :'( :/ O:) :P :O &) ^_^ >:O :3 >:( 8| O.o -_- 3:) <3 :V :|] (^^^) <(")  ༼ʘ̚ل͜ʘ̚༽ ⚆ _ ⚆
      let final_score = cal_score(sum_act_val,sum_act_val);
      let emoji;
      if(final_score < 10){
        emoji = '^_^';
      }
      else if(final_score >= 10 && final_score < 35){
        emoji = '°_°';

      }else{
        emoji = "°O°";
      }
      compareBtn.innerHTML = "Your Score:  " + final_score + "&nbsp &nbsp" + emoji;
      retakeButton.disabled = false;
    }
  }
}

function cal_score(sum_touched_val, sum_act_val){
  let sum_d = 0;
  let p;
  for(let i=0; i<49; i++){
    sum_d += Math.abs(touchedDraw_val[i] - actDraw_val[i]);
  }
  if (sum_touched_val === 0){
    p = 0
  }else{
    p = 1 - sum_d / (sum_touched_val + sum_act_val);
  }
  let score = parseInt(p * 100);
  return score;
}

function createTouchListener(){
  setFocusCanvasPos(touch_Cnv);
  touch_Cnv.style.className = 'touchCnv';
  
  touch_Cnv.addEventListener('touchstart', touchingEventHandler);
  touch_Cnv.addEventListener('touchmove', touchingEventHandler);
  touch_Cnv.addEventListener('touchend', endtouchEventHandler);
}

function removeTouchListener(){
  touch_Cnv.removeEventListener('touchstart', touchingEventHandler);
  touch_Cnv.removeEventListener('touchmove', touchingEventHandler);
  touch_Cnv.removeEventListener('touchend', endtouchEventHandler);
}

function touchingEventHandler(e){
  e.preventDefault();
  let corrected_x = e.changedTouches[0].clientX - focus_offset_x;
  let corrected_y = e.changedTouches[0].clientY - focus_offset_y;
  myTouchDraw.draw(corrected_x, corrected_y);
}

function endtouchEventHandler(e){
  e.preventDefault();
  myTouchDraw.touchEnd_update();
}

function setFocusCanvasPos(canvas){
  canvas.height = focus_side_length;
  canvas.width = focus_side_length;
  canvas.style.left = focus_offset_x;
  canvas.style.top = focus_offset_y;
  canvas.style.position = "absolute";
}

class touchDrawRect{
  constructor(context){
    this.context = context;
    this.pre_grid = [-1,-1];
    this.m = focus_side_length/7;
  }

  cal_grid_pos(x, y){
    let grid_pos = [2];
    grid_pos[0] = parseInt(x/this.m);
    grid_pos[1] = parseInt(y/this.m);
    return grid_pos;
  }

  draw(x, y){
    let i = this.cal_grid_pos(x, y)[0];
    let j = this.cal_grid_pos(x, y)[1];

    if(i != this.pre_grid[0] || j != this.pre_grid[1]){
      this.context.beginPath();
      this.context.fillStyle = 'rgba(0,240,255,0.1)';
      this.context.rect(i*this.m+2, j*this.m+2, this.m-4, this.m-4);
      this.context.fill();
      this.context.closePath();
      touchedDraw_val[j*7 + i] += 0.1;
      // console.log("touchedDraw_val: " + touchedDraw_val);
      this.pre_grid[0] = i;
      this.pre_grid[1] = j;
    }
  }

  touchEnd_update(){
    this.pre_grid  = [-1,-1];
  }
}