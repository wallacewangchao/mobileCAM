var video;
var takePhotoButton;
var toggleFullScreenButton;
var switchCameraButton;
var amountOfCameras = 0;
var currentFacingMode = 'environment';

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
});

function initCameraUI() {
  video = document.getElementById('video');

  takePhotoButton = document.getElementById('takePhotoButton');
  toggleFullScreenButton = document.getElementById('toggleFullScreenButton');
  switchCameraButton = document.getElementById('switchCameraButton');

  let camera_width = video.offsetWidth;
  let camera_height = video.offsetHeight;

  //set camera focus rect size and position
  let focus_side_length = 0.9 * camera_width;
  console.log(focus_side_length);
  let focus_rect = document.getElementById("focus_rect");
  focus_rect.setAttribute("height", focus_side_length);
  focus_rect.setAttribute("width", focus_side_length);
  let t_val = 'translate(' + (-focus_side_length/2) + ' ' + (-focus_side_length/2) + ')';
  focus_rect.setAttribute("transform", t_val);

  // let side_length = 0.9 * camera_width;
  // let square_center_x = 0.5 * camera_width;
  // let square_center_y = 0.5 * camera_height;
  // let mask_points = {
  //   x_0:0,
  //   y_0:0,
  //   x_1:0,
  //   y_1:camera_height,
  //   x_2:square_center_x - side_length/2,
  //   y_2:camera_height,
  //   x_3:square_center_x - side_length/2,
  //   y_3:square_center_y - side_length/2,
  //   x_4:square_center_x + side_length/2,
  //   y_4:square_center_y - side_length/2,
  //   x_5:square_center_x + side_length/2,
  //   y_5:square_center_y + side_length/2,
  //   x_6:square_center_x - side_length/2,
  //   y_6:square_center_y + side_length/2,
  //   x_7:square_center_x - side_length/2,
  //   y_7:camera_height,
  //   x_8:camera_width,
  //   x_8:camera_height,
  //   x_9:camera_width,
  //   y_9:camera_height
  // }
  
  // video_cover.style.setProperty('p0_x',0);
  // video_cover.style.setProperty('p0_y',0);
  // video_cover.style.setProperty('p1_x',0);
  // video_cover.style.setProperty('p1_y',camera_height);
  // video_cover.style.setProperty('p2_x',square_center_x - side_length/2);
  // video_cover.style.setProperty('p3_y',square_center_x - side_length/2);
  // video_cover.style.setProperty('p3_x',square_center_x - side_length/2);

  // https://developer.mozilla.org/nl/docs/Web/HTML/Element/button
  // https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_button_role

  // takePhotoButton.addEventListener('click', function () {
  //   takeSnapshotUI();
  //   takeSnapshot();
  // });

  // -- fullscreen part

  // function fullScreenChange() {
  //   if (screenfull.isFullscreen) {
  //     toggleFullScreenButton.setAttribute('aria-pressed', true);
  //   } else {
  //     toggleFullScreenButton.setAttribute('aria-pressed', false);
  //   }
  // }

  // if (screenfull.isEnabled) {
  //   screenfull.on('change', fullScreenChange);

  //   toggleFullScreenButton.style.display = 'block';

  //   // set init values
  //   fullScreenChange();

  //   toggleFullScreenButton.addEventListener('click', function () {
  //     screenfull.toggle(document.getElementById('container')).then(function () {
  //       console.log(
  //         'Fullscreen mode: ' +
  //           (screenfull.isFullscreen ? 'enabled' : 'disabled'),
  //       );
  //     });
  //   });
  // } else {
  //   console.log("iOS doesn't support fullscreen (yet)");
  // }

  // -- switch camera part
  // if (amountOfCameras > 1) {
  //   switchCameraButton.style.display = 'block';

  //   switchCameraButton.addEventListener('click', function () {
  //     if (currentFacingMode === 'environment') currentFacingMode = 'user';
  //     else currentFacingMode = 'environment';

  //     initCameraStream();
  //   });
  // }

  // Listen for orientation changes to make sure buttons stay at the side of the
  // physical (and virtual) buttons (opposite of camera) most of the layout change is done by CSS media queries
  // https://www.sitepoint.com/introducing-screen-orientation-api/
  // https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation
  // window.addEventListener(
  //   'orientationchange',
  //   function () {
  //     // iOS doesn't have screen.orientation, so fallback to window.orientation.
  //     // screen.orientation will
  //     if (screen.orientation) angle = screen.orientation.angle;
  //     else angle = window.orientation;

  //     var guiControls = document.getElementById('gui_controls').classList;
  //     var vidContainer = document.getElementById('vid_container').classList;

  //     if (angle == 270 || angle == -90) {
  //       guiControls.add('left');
  //       vidContainer.add('left');
  //     } else {
  //       if (guiControls.contains('left')) guiControls.remove('left');
  //       if (vidContainer.contains('left')) vidContainer.remove('left');
  //     }

  //     //0   portrait-primary
  //     //180 portrait-secondary device is down under
  //     //90  landscape-primary  buttons at the right
  //     //270 landscape-secondary buttons at the left
  //   },
  //   false,
  // );
}

function initCameraStream() {
  // stop any active streams in the window
  if (window.stream) {
    window.stream.getTracks().forEach(function (track) {
      console.log(track);
      track.stop();
    });
  }

  // we ask for a square resolution, it will cropped on top (landscape)
  // or cropped at the sides (landscape)
  var size = 1280;

  var constraints = {
    audio: false,
    video: {
      width: { ideal: size },
      height: { ideal: size },
      //width: { min: 1024, ideal: window.innerWidth, max: 1920 },
      //height: { min: 776, ideal: window.innerHeight, max: 1080 },
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