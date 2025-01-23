/*******************************************************
 * 1) Grab references to all the elements we need:
 *    - The percentage text inside the ring
 *    - The circle that will fill up
 *    - The background image that will transition
 *******************************************************/
const percentDisplay = document.querySelector('.percent-display');
const ringFill = document.querySelector('.ring-fill');
const bgImage = document.querySelector('.background-image');

/********************************************
 * 2) Define our initial loading percentage:
 *    We'll animate from 0 up to 100.
 ********************************************/
let loadValue = 0;

/******************************************************
 * 3) Use setInterval to increment the loading value
 *    every 40ms (~25 times per second).
 ******************************************************/
const interval = setInterval(() => {
  loadValue++;

  // Once loadValue exceeds 100, we stop the interval.
  if (loadValue > 100) {
    clearInterval(interval);
    return;
  }

  // Update the text that displays the percentage
  percentDisplay.textContent = loadValue + '%';

  /************************************************************
   * 4) Calculate the new stroke-dashoffset for the ring-fill:
   *    - If we have a total circumference of 339.292,
   *      at 0% we want strokeDashoffset = 339.292 (empty).
   *      at 100% we want strokeDashoffset = 0 (full).
   ************************************************************/
  const circumference = 339.292;
  // The fraction of the ring that should be filled
  const offset = circumference - (loadValue / 100) * circumference;
  ringFill.style.strokeDashoffset = offset;

  /**************************************************************
   * 5) Modify the grayscale filter on the background image:
   *    - mapRange() converts loadValue from [0..100] to [100..0].
   *    - As loadValue goes up to 100, grayValue goes down to 0,
   *      thus removing the grayscale effect.
   **************************************************************/
  const grayValue = mapRange(loadValue, 0, 100, 100, 0);
  bgImage.style.filter = `grayscale(${grayValue}%)`;

  // Uncomment for debugging: see how values change in the console
  // console.log(`loadValue: ${loadValue}, grayValue: ${grayValue}`);
}, 40);


/*************************************************************************
 * 6) The mapRange() function:
 *    - Takes 'num' within the range [inMin..inMax]
 *    - Returns a corresponding value in [outMin..outMax]
 *************************************************************************/
function mapRange(num, inMin, inMax, outMin, outMax) {
  return ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
