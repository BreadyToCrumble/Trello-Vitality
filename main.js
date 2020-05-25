// =====================DEPENDENCIES AND CONSTANTS===========================

// apis
const CronJob = require("cron").CronJob
const http = require("request-promise")
const bottleneck = require("bottleneck")

const limiter = new bottleneck(1, 100)
limiter.on("dropped", function(){ console.log("QUEUE OVERFLOW")})
limiter.on("debug", function(msg, dat){ console.log(msg)})


// trello
const key = "YOUR KEY HERE"
const token = "YOUR TOKEN HERE"
const addon = "key="+key+"&token="+token



// =====================MAIN FUNCTION==========================


function pad(d) {
    return (d < 10) ? '0' + d.toString() : d.toString()
}

async function wait(second) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () { resolve(); }, second*1000);
    });
}

async function func() {
	console.log("Backing up boards...")
	
	let boards = await limiter.schedule(async function() {
		return await http.get({
			uri: "https://api.trello.com/1/members/me/boards?" + addon,
			json: true
		}).catch(function(err) {
			console.log("\n----------------\nError obtaining boards:\n\n" + err + "\n----------------\n")
		})
	})
	
	boards.forEach(async function(v, i, b) {
		if (v.closed) { return }
		
		if (v.name.substring(1, 3) === "07") {
			// This detects backups that are ^ days old and deletes them. Goes up to 99.
			limiter.schedule(async function() {
				http.delete({
					url: "https://api.trello.com/1/boards/" + v.id + "?" + addon,
					json: true
				}).catch(function(err) {
					console.log("\n----------------\nError deleting old board:\n\n" + err + "\n----------------\n")
				})
			})
			
			
			
		} else if (!isNaN(Number(v.name.substring(1, 3)))) {
			// This detects backups that aren't quite that old yet, and renames them to increment their number.
			let number = Number(v.name.substring(1, 3))
			limiter.schedule(async function() {
				await http.put({
					uri: "https://api.trello.com/1/boards/" +  v.id +"?" + addon,
					json: true,
					body: {
						name: "[" + pad(number+1) + "] " + v.name.substring(5),
					}
				}).catch(function(err) {
					console.log("\n----------------\nError renaming semi-old board:\n\n" + err + "\n----------------\n")
				})
			})
				
			
			
		} else {
			// This detects the main boards and creates today's backup.
			let newBoard = await limiter.schedule(async function() {
				return await http.post({
					uri: "https://api.trello.com/1/boards?" + addon,
					json: true,
					body: {
						name: "[01] " + v.name,
						prefs_permissionLevel: "private",
						defaultLabels: false,
						defaultLists: false
					}
				}).catch(function(err) {
					console.log("\n----------------\nError cloning new board:\n\n" + err + "\n----------------\n")
				})
			})
			let listsToCopy = await limiter.schedule(async function() {
				return await http.get({
					uri: "https://api.trello.com/1/boards/" + v.id + "/lists?" + addon,
					json: true
				}).catch(function(err) {
					console.log("\n----------------\nError obtaining lists to clone:\n\n" + err + "\n----------------\n")
				})
			})
			
			// Goes through each existing list and copies it; allows for copying of things such as card comments, actions, etc.
			listsToCopy.forEach(async function(list, i1, l) {
				//await wait(1)
				limiter.schedule(async function() {
					
					
					await http.post({
						uri: "https://api.trello.com/1/lists?" + addon,
						json: true,
						body: {
							idBoard: newBoard.id,
							name: list.name,
							idListSource: list.id,
							pos: list.pos
						}
					}).catch(function(err) {
						console.log("\n----------------\nError cloning list:\n\n" + err + "\n----------------\n")
					})
					
					
				})
			})
		}
	})
	
	console.log("All tasks scheduled.")
}

var main  = new CronJob('00 00 05 * * *', func, null, true, 'America/Los_Angeles')

// =================================================================

console.log("Successfully initialized.")