
const context = new AudioContext();
const elements = {};

function load(url, callback) {
  const request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = () => {
    context.decodeAudioData(request.response, buffer => {
      callback(buffer);
    });
  };

  request.send();
};

function initGraph() {
  const title = '都道府県別わさび生産量（2017）';
  const data = [
    ['長野', 808.9],
    ['岩手', 540.6],
    ['静岡', 510.6],
    ['高知', 70.7],
    ['島根', 63.5],
    ['大分', 37.2],
    ['東京', 33],
    ['宮崎', 18.7],
  ];
  const origin = 0;
  const largeScale = 1000;
  const unit = '（トン）';
  const barColor = ['#558b2f', '#7cb342', '#9ccc65'];

  elements.root = document.getElementById('graph');
  elements.rootClone = elements.root.cloneNode(true);

  elements.lines = elements.rootClone.querySelectorAll('#scales > line');
  elements.linesYMin = Number(elements.lines[0].getAttribute('y1'));
  elements.linesYMax = Number(elements.lines[0].getAttribute('y2'));

  elements.labels = [];
  elements.bars = [];

  const labelRoot = elements.rootClone.getElementById('labels');
  const labelBase = labelRoot.querySelector('text');
  const labelBaseY = Number(labelBase.getAttribute('y'));

  const barRoot = elements.rootClone.getElementById('bars');
  const barBase = barRoot.querySelector('rect');
  const barBaseY = Number(barBase.getAttribute('y'));
  const barRange =
    Number(elements.lines[1].getAttribute('x1')) -
    Number(elements.lines[0].getAttribute('x1'));

  for (let i = 0; i < data.length; i++) {
    const label = labelBase.cloneNode();
    label.textContent = data[i][0];
    label.setAttribute('y', labelBaseY + 40 * i);
    labelRoot.appendChild(label);
    elements.labels.push(label);

    const bar = barBase.cloneNode();
    bar.setAttribute('width', barRange * data[i][1] / largeScale);
    bar.setAttribute('y', barBaseY + 40 * i);
    if (i < barColor.length) {
      bar.setAttribute('fill', barColor[i])
    }
    barRoot.appendChild(bar);
    elements.bars.push(bar);
  }

  labelRoot.removeChild(labelBase);
  barRoot.removeChild(barBase);

  elements.scales = elements.rootClone.querySelectorAll('#scales > text');
  elements.scales[0].textContent = origin;
  elements.scales[1].textContent = largeScale;
  elements.scales[2].textContent = unit;

  elements.title = elements.rootClone.getElementById('title');
  elements.title.textContent = title;

  document.body.removeChild(elements.root);
  elements.root = elements.rootClone.cloneNode(true);
  document.body.insertBefore(elements.root, document.body.firstChild);
}

function render(spectrum) {
  const bars = elements.bars;

  const parted = [];
  const len = Math.ceil(spectrum.length / bars.length);

  for (let i = 0; i < len; i++) {
    const j = i * bars.length;
    const part = spectrum.slice(j, j + bars.length);

    const average = part.reduce((prev, current) => prev + current) / part.length;
    parted.push(average);
  }

  function normalize(min, max, value) {
    return (value - min) / (max - min);
  }

  const amplified = parted.map(v => {
    const n = normalize(50, 300, v);
    return v * (0.5 + n) ** 2;
  });

  for (let i = 0; i < bars.length; i++) {
    bars[i].setAttribute('width', amplified[i]);
  }

  for (let i = 0; i < elements.labels.length; i++) {
    elements.labels[i].setAttribute('font-size', amplified[i] / 10);
  }

  const allAverage =
    parted.reduce((prev, current) => prev + current) / parted.length;

  elements.title.setAttribute('font-size', 18 + allAverage / 30);

  elements.scales.forEach(v => {
    v.setAttribute('font-size', 14 + allAverage / 30);
  });

  elements.lines[0].setAttribute('y2', elements.linesYMin + allAverage * 2);
  elements.lines[1].setAttribute('y1', elements.linesYMax - allAverage * 2);

  document.body.removeChild(elements.root);
  elements.root = elements.rootClone.cloneNode(true);
  document.body.insertBefore(elements.root, document.body.firstChild);
}

function play(buffer) {
  let isPlaying = true;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.onended = () => {
    isPlaying = false;
  };

  const gainNode = context.createGain();
  gainNode.gain.value = 0.6;

  const analyzerNode = context.createAnalyser();
  analyzerNode.smoothingTimeConstant = 0.6;

  source.connect(gainNode);
  gainNode.connect(analyzerNode);
  analyzerNode.connect(context.destination);

  const spectrum = new Uint8Array(analyzerNode.frequencyBinCount);

  function update() {
    if (isPlaying) {
      analyzerNode.getByteFrequencyData(spectrum);
      render(spectrum);
      requestAnimationFrame(update);
    }
  }

  source.start();

  requestAnimationFrame(update);
};

window.addEventListener('DOMContentLoaded', () => {
  initGraph();

  load('audio.mp3', buffer => {
    const playElement = document.getElementById('play');
    playElement.innerText = 'スタート';
    playElement.classList.add('active');

    playElement.addEventListener('click', () => {
      play(buffer);
      playElement.style.visibility = 'hidden';
    });
  });
});
