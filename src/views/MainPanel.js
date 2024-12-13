/*global KeyboardEvent*/
import {BodyText} from '@enact/sandstone/BodyText';
import {Panel, Header} from '@enact/sandstone/Panels';
import Spotlight from '@enact/spotlight';
import {
	GestureRecognizer,
	FilesetResolver,
	DrawingUtils
} from '@mediapipe/tasks-vision';
import {useEffect, useRef, useState} from 'react';

import GestureSampler from '../components/GestureSampler';
import PopupTabLayoutByGesture from './PopupTabLayoutByGesture';

import css from './MainPanel.module.less';

let gestureRecognizer;
const videoHeight = '360px';
const videoWidth = '480px';

const sampler = new GestureSampler(1000);

const MainPanel = (props) => {
	const video = useRef();
	const canvas = useRef();
	let canvasCtx;
	let lastVideoTime = -1;
	let results = undefined;
	const [output, setOutput] = useState('Welcome!');

	const createGestureRecognizer = async () => {
		const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
		gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
		  baseOptions: {
			modelAssetPath: './thumbed_5way_recognizer.task',
			delegate: 'GPU'
		  },
		  runningMode: 'VIDEO'
		});
	};

	// Check if webcam access is supported.
	function hasGetUserMedia () {
		return !!(typeof window !== 'undefined' && window.navigator.mediaDevices && window.navigator.mediaDevices.getUserMedia);
	}

	// Enable the live webcam view and start detection.
	function enableCam () {
		if (!gestureRecognizer) {
			setOutput('Please wait for gestureRecognizer to load');
		} else if (!hasGetUserMedia()) {
			setOutput('getUserMedia() is not supported by your browser');
		} else if (typeof window !== 'undefined') {
			window.navigator.mediaDevices.getUserMedia({
				audio: false,
				video: true
			}).then(function (stream) {
				video.current.srcObject = stream;
				video.current.addEventListener("loadeddata", predict);
			});
		}
	}

	function moveSpotlight (direction) {
		if (direction === 'ok') {
			Spotlight.getCurrent()?.click();
		} else if (direction === 'left') {
			if (!Spotlight.move('left')) {
				setTimeout(() => {
					Spotlight.getCurrent()?.dispatchEvent(new KeyboardEvent('keydown', {key: 'left', keyCode: 37, bubbles: true}));
					setTimeout(() => {
						Spotlight.getCurrent()?.dispatchEvent(new KeyboardEvent('keyup', {key: 'left', keyCode: 37, bubbles: true}));
					}, 100);
				}, 100);
			}
		} else {
			Spotlight.move(direction);
		}
	}

	async function predict() {
		const webcamElement = video.current;
		const canvasElement = canvas.current;
		let nowInMs = Date.now();
		if (webcamElement.currentTime !== lastVideoTime) {
			lastVideoTime = webcamElement.currentcurrentTime;
			results = gestureRecognizer.recognizeForVideo(webcamElement, nowInMs);
		}

		canvasCtx = canvas.current.getContext('2d');
		canvasCtx.save();
		canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
		const drawingUtils = new DrawingUtils(canvasCtx);

		canvasElement.style.height = videoHeight;
		webcamElement.style.height = videoHeight;
		canvasElement.style.width = videoWidth;
		webcamElement.style.width = videoWidth;

		if (results.landmarks) {
			for (const landmarks of results.landmarks) {
				drawingUtils.drawConnectors(
					landmarks,
					GestureRecognizer.HAND_CONNECTIONS,
					{
						color: "#00FF00",
						lineWidth: 5
					}
				);
				drawingUtils.drawLandmarks(landmarks, {
					color: "#FF0000",
					lineWidth: 2
				});
			}
		}
		canvasCtx.restore();
		if (results.gestures.length > 0) {
			const categoryName = results.gestures[0][0].categoryName;
			const categoryScore = parseFloat(
			results.gestures[0][0].score * 100
			).toFixed(2);
			const handedness = results.handednesses[0][0].displayName;
			console.log(`GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`);
			//console.log("org gesture: ", gesture, " categoryName: ", categoryName);
			sampler.sample(categoryName, categoryScore, moveSpotlight);
		} else {
			setOutput('');
		}
		// Call this function again to keep predicting when the browser is ready.
		if (typeof window !== 'undefined') {
			window.requestAnimationFrame(predict);
		}
	}

	useEffect (() => {
		createGestureRecognizer().then(() => {
			enableCam();
		}).catch((error) => {
			console.log(error.message);
		});
	}, []);

	return (
		<Panel {...props}>
			<Header title="Gesture Control PoC" />
			<div>
				<video className={css.video} autoPlay playsInline ref={video} />
				<canvas
					className={css.outputCanvas}
					width='1280'
					height='720'
					ref={canvas}
				/>
				<PopupTabLayoutByGesture />
				<br />
				<BodyText className={css.output}>{output}</BodyText>
			</div>
		</Panel>
	);
};

MainPanel.displayName = 'MainPanel';

export default MainPanel;
