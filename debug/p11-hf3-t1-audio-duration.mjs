import { readFileSync } from "fs";
// Just check the file size
console.log("alarm.mp3:", readFileSync("resources/nemesis/sounds/alarm.mp3").length);
console.log("048.wav:", readFileSync("resources/nemesis/sounds/monsters/048.wav").length);
console.log("power/3.wav:", readFileSync("resources/nemesis/sounds/power/3.wav").length);
