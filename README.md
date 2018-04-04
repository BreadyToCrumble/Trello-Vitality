# Trello-Vitality
This is a bot you can run on a server (I use a heroku dyno) that backs up Trello boards. 
It will back up every board on the account of the key and token given. 
The key and token must have both read and write permissions.

You can place the key and token into the script on the first couple lines, or
you can use some fancy environment constants if you know how to/want to do that.

If you want to run it on your pc and then have it make a backup upon program start, 
just add the line "func()" to the bottom of your script. That way, it'll run every
time it starts up.
