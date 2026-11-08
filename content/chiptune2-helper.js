window['libopenmpt'] = {};
    libopenmpt.locateFile = function (filename) {
      return "//cdn.jsdelivr.net/gh/deskjet/chiptune2.js@master/" + filename;
    };
    libopenmpt.onRuntimeInitialized = function () {
      var player;
      var currentBuffer;
      var volume = 1;

      function init() {
        if (player == undefined) {
          player = new ChiptuneJsPlayer(new ChiptuneJsConfig(-1));
        }
        else {
          resetPlayerState();
        }
      }

      function setMetadata(path) {
        var metadata = player.metadata();
        var filename = path.name || path.split('/').pop() || path;
        document.getElementById('filename').innerHTML = filename;
        if (metadata['title'] != '') {
          document.getElementById('title').innerHTML = metadata['title'];
        }
        else {
          document.getElementById('title').innerHTML = '';
        }

        if (metadata['artist'] != '') {
          document.getElementById('artist').innerHTML = '<br />' + metadata['artist'];
        }
        else {
          document.getElementById('artist').innerHTML = '';
        }
      }

      function afterLoad(path, buffer) {
        currentBuffer = buffer;
        document.querySelectorAll('#pitch,#tempo').forEach(e => e.value = 1);
        var volumeControl = document.querySelector('#volume');
        if (volumeControl) {
          volumeControl.value = volume;
        }
        player.play(buffer);
        player.setVolume(volume);
        setMetadata(path);

        // Setup seekbar
        var seekbar = document.getElementById('seekbar');
        var timeDisplay = document.getElementById('time-display');
        seekbar.max = player.duration();
        seekbar.value = 0;
        

        function formatTime(seconds) {
          var min = Math.floor(seconds / 60);
          var sec = Math.floor(seconds % 60);
          return min + ':' + (sec < 10 ? '0' : '') + sec;
        }

        const slider = document.querySelector("#seekbar");

        function updateSeekbar() {
          if (player.currentPlayingNode) {
            var current = player.getCurrentTime();
            var total = player.duration();
            seekbar.value = current;
            timeDisplay.textContent = formatTime(current) + '/' + formatTime(total);
            
            
            const percent = (current / total) * 100;
            seekbar.style.setProperty("--progress", percent + "%");
          }
        }

        slider.addEventListener("input", () => {
          const percent = (slider.value - slider.min) / (slider.max - slider.min) * 100;
          slider.style.setProperty("--progress", percent + "%");
        });

        var updateInterval = setInterval(updateSeekbar, 30);

        seekbar.addEventListener('mousedown', function() {
          clearInterval(updateInterval);
        });

        seekbar.addEventListener('change', function(e) {
          player.seekTo(parseFloat(e.target.value));
          updateInterval = setInterval(updateSeekbar, 100);
        });

        updateControlState();
      }

      function loadURL(path) {
        init();
        player.load(path, afterLoad.bind(this, path));
      }

      function playButton() {
        if (!player.currentPlayingNode && currentBuffer) {
          player.play(currentBuffer);
        } else if (player.currentPlayingNode && player.currentPlayingNode.paused) {
          player.togglePause();
        }
        updateControlState();
      }

      function pauseButton() {
        if (player.currentPlayingNode && !player.currentPlayingNode.paused) {
          player.togglePause();
        }
        updateControlState();
      }

      function stopButton() {
        resetPlayerState();
      }

      function updateControlState() {
        var hasPlayingNode = player && player.currentPlayingNode;
        var isPaused = hasPlayingNode && hasPlayingNode.paused;
        var isPlaying = hasPlayingNode && !isPaused;
        var isStopped = !hasPlayingNode;

        document.getElementById('play').disabled = !currentBuffer;
        document.getElementById('pause').disabled = !hasPlayingNode || isPaused;
        document.getElementById('stop').disabled = !hasPlayingNode;

        document.getElementById('play').classList.toggle('active', !!isPlaying);
        document.getElementById('pause').classList.toggle('active', !!isPaused);
        document.getElementById('stop').classList.toggle('active', !!isStopped);
      }

      function resetPlayerState() {
        if (player) {
          player.stop();
        }
        currentBuffer = undefined;
        document.getElementById('title').textContent = 'chiptune.js';
        document.getElementById('artist').textContent = '';
        document.getElementById('filename').textContent = '';
        document.getElementById('seekbar').max = 100;
        document.getElementById('seekbar').value = 0;
        document.getElementById('seekbar').style.setProperty('--progress', '0%');
        document.getElementById('time-display').textContent = '0:00/0:00';
        document.querySelectorAll('#pitch,#tempo').forEach(e => e.value = '');
        var volumeControl = document.querySelector('#volume');
        if (volumeControl) {
          volumeControl.value = volume;
        }
        updateControlState();
      }

      

      var fileaccess = document.querySelector('*');
      fileaccess.ondrop = function (e) {
        e.preventDefault();
        var file = e.dataTransfer.files[0];
        init();

        player.load(file, afterLoad.bind(this, path));
      }

      fileaccess.ondragenter = function (e) { e.preventDefault(); }
      fileaccess.ondragover = function (e) { e.preventDefault(); }

      document.querySelectorAll('.song').forEach(function (e) {
        e.addEventListener('click', function (evt) {
          modurl = evt.target.getAttribute("data-modurl");
          loadURL(modurl);
        }, false);
      });

      document.querySelector('input[name=files]').addEventListener('change', function (evt) {
        loadURL(evt.target.files[0]);
      });

      document.querySelector('input[name=submiturl]').addEventListener('click', function () {
        var exturl = document.querySelector('input[name=exturl]');
        modurl = exturl.value;
        loadURL(modurl);
        exturl.value = null;
      });

      document.querySelector('#play').addEventListener('click', playButton, false);
      document.querySelector('#pause').addEventListener('click', pauseButton, false);
      document.querySelector('#stop').addEventListener('click', stopButton, false);
      updateControlState();

      var pitchControl = document.querySelector('#pitch');
      if (pitchControl) {
        pitchControl.addEventListener('input', function (e) {
          player.module_ctl_set('play.pitch_factor', e.target.value.toString());
        }, false);
      }

      var tempoControl = document.querySelector('#tempo');
      if (tempoControl) {
        tempoControl.addEventListener('input', function (e) {
          player.module_ctl_set('play.tempo_factor', e.target.value.toString());
        }, false);
      }

      var volumeControl = document.querySelector('#volume');
      if (volumeControl) {
        volumeControl.value = volume;
        volumeControl.addEventListener('input', function (e) {
          volume = parseFloat(e.target.value);
          player.setVolume(volume);
        }, false);
      }

    
    };