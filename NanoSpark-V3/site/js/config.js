/**
 * Nano Spark - Panorama Configuration
 * Professional config module. Edit this file to add your own 360° scenes.
 * All images can be equirectangular 2:1 for true 360°, or regular photos (still immersive).
 * @module config
 */

/**
 * @typedef {Object} Hotspot
 * @property {number} yaw - Horizontal angle -180 to 180 (0 = front, 90 = right)
 * @property {number} pitch - Vertical angle -85 to 85 (0 = horizon)
 * @property {string} target - ID of panorama to jump to
 * @property {string} label - Button label
 */

/**
 * @typedef {Object} Panorama
 * @property {string} id - Unique ID (no spaces)
 * @property {string} title
 * @property {string} desc
 * @property {string} image - Relative path from index.html
 * @property {Hotspot[]} hotspots
 */

/** @type {Panorama[]} */
export const panoramas = [
  {
    id: 'lab-main',
    title: 'Lab - Main Hall',
    desc: 'Central workspace - robotics & prototyping',
    image: 'assets/inside-view-lab.png',
    hotspots: [
      { yaw: 30, pitch: 2, target: 'lab-drone', label: 'Drone View' },
      { yaw: -45, pitch: -5, target: 'robotics', label: 'Robotics Zone' },
      { yaw: 120, pitch: 0, target: 'electronics', label: 'Electronics' },
    ],
  },
  {
    id: 'lab-drone',
    title: 'Lab - Drone View',
    desc: 'Aerial perspective of the entire STEM lab',
    image: 'assets/lab-drone-view.png',
    hotspots: [
      { yaw: -10, pitch: 0, target: 'lab-main', label: '← Back to Main' },
      { yaw: 60, pitch: -4, target: 'iot', label: 'IoT Zone' },
      { yaw: -90, pitch: 2, target: 'coding', label: 'Coding Zone' },
    ],
  },
  {
    id: 'robotics',
    title: 'Robotics Zone',
    desc: 'Build • Program • Test real robots',
    image: 'assets/robotics-zone.png',
    hotspots: [
      { yaw: -30, pitch: 0, target: 'lab-main', label: '← Main Hall' },
      { yaw: 40, pitch: 0, target: 'innovation', label: 'Innovation Lab' },
    ],
  },
  {
    id: 'coding',
    title: 'Coding Zone',
    desc: 'Where ideas become software',
    image: 'assets/coding-zone.png',
    hotspots: [
      { yaw: 10, pitch: 0, target: 'lab-main', label: '← Main Hall' },
      { yaw: -50, pitch: 0, target: 'robotics', label: 'Robotics' },
    ],
  },
  {
    id: 'electronics',
    title: 'Electronics Zone',
    desc: 'Circuits, Arduino, ESP32, sensors',
    image: 'assets/electronicszone.png',
    hotspots: [
      { yaw: 0, pitch: 0, target: 'lab-main', label: '← Main Hall' },
      { yaw: 90, pitch: 0, target: 'iot', label: 'IoT Zone →' },
    ],
  },
  {
    id: 'iot',
    title: 'IoT Zone',
    desc: 'Connect the physical world',
    image: 'assets/iot-zone.png',
    hotspots: [
      { yaw: 180, pitch: 0, target: 'lab-main', label: '← Main Hall' },
      { yaw: -60, pitch: 0, target: 'electronics', label: 'Electronics' },
    ],
  },
  {
    id: 'innovation',
    title: 'Innovation & Prototyping',
    desc: 'Idea → Design → Build → Test',
    image: 'assets/innovation-and-protytping-zone.png',
    hotspots: [
      { yaw: 20, pitch: 0, target: 'lab-main', label: '← Main Hall' },
      { yaw: -30, pitch: 0, target: 'lab-drone', label: 'Drone View' },
    ],
  },
];

/**
 * Zone modal data - used when clicking zone cards without pano link
 */
export const zoneData = {
  Robotics: {
    image: 'assets/robotics-zone.png',
    title: 'Build. Program. Test.',
    text: 'Hands-on robotics from mechanisms to programmed prototypes.',
  },
  Coding: {
    image: 'assets/coding-zone.png',
    title: 'Turn ideas into software.',
    text: 'Coding becomes tangible through projects on real devices.',
  },
  Electronics: {
    image: 'assets/electronicszone.png',
    title: 'Make circuits come alive.',
    text: 'Arduino, ESP32, LEDs, meters and soldering - learn by making.',
  },
  IoT: {
    image: 'assets/iot-zone.png',
    title: 'Connect the physical world.',
    text: 'Sensors, microcontrollers and connected systems.',
  },
  Innovation: {
    image: 'assets/innovation-and-protytping-zone.png',
    title: 'Idea → prototype.',
    text: 'Combine skills, build, test and iterate.',
  },
};

/** Optional: If you prefer JSON-driven config, fetch panoramas/config.json instead.
 *  Keep this JS file as fallback if JSON fails to load.
 */
export async function loadExternalConfig(url = 'panoramas/config.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length) return data;
  } catch (e) {
    console.warn('[config] external config not loaded, using built-in:', e.message);
  }
  return null;
}
