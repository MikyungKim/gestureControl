class GestureSampler {
	constructor (rate = 100) {
		// The minimum time between samples
		this.rate = rate;

		// The timestamp of the last sampled gesture
		this.time = 0;

		// The gesture of the last sampled
		this.gesture = '';
	}

	/**
	 * @function sample
	 * @memberof GestureSampler.prototype
	 */
	sample = (gesture, confidence, callback) => {
		if (gesture !== this.gesture && confidence > 80) {
			// If the gesture is different, update the time and gesture
			this.time = Date.now();
			this.gesture = gesture;

			return (gesture !== '' && gesture !== 'none') && callback(gesture);
		} else if (gesture !== '' && gesture !== 'none' && confidence > 80) {
			const now = Date.now();

			if (now - this.time >= this.rate) {
				this.time = now;
				console.log('gesture: ', gesture);

				return callback(gesture);
			}
		}
	}
}

export default GestureSampler;
export {GestureSampler};
