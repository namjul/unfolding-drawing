
// For interactive documentation and code auto-completion in editor
/** @typedef {import('pear-interface')} */

/** @type {Pear} */
const { teardown, updates } = Pear

// Enable automatic reloading for the app
// This is optional but helpful during production
updates(() => Pear.reload())
