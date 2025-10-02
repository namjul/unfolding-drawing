
import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'

// For interactive documentation and code auto-completion in editor
/** @typedef {import('pear-interface')} */

/** @type {Pear} */
const { teardown, updates } = Pear
//
// Unannounce the public key before exiting the process
// (This is not a requirement, but it helps avoid DHT pollution)
teardown(() => swarm.destroy())

// Enable automatic reloading for the app
// This is optional but helpful during production
updates(() => Pear.reload())


export const topic = Pear.config.args[0] ? b4a.from(Pear.config.args[0], 'hex') : crypto.randomBytes(32)
export const swarm = new Hyperswarm()

