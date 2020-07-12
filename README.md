# role-assignment-bot  
A JavaScript based Discord bot allowing users to assigne themselves to pingable roles using reaction emotes.
### Details
- Uses the Discord.js library
- Uses a Discord channel as a living database avoiding any DB setup
- Allows the server ownder to dictate one or many roles to be selectable
### Installation instructions
- Clone the repository to your local machine
- Create an auth.json file inside of the cloned reposity
- - make a 'Token' key and a 'botId' key and assign your bot token and bot Id values respectively
`{`
   `"token": "Your Token Here",`
   `"botId": "Your Bot Id here"`
`}`
- run: 'npm install' in the bot directory
- run: 'node bot.js' to begin the bot
### Usage  
*The following help command is printed using @react4role help*   
**@react4role help** => Displays this message  
**choose (any|one)** => this command allows server owners to set a message that users can react to with specified emojis that will add them to their desired roles  
USAGE:  
    :joy: choose any  
     @Role Name  

Users can then react to the message with the corresponding role to join the role  
If 'choose one' is used, users can only join one of the roles. 'choose any' will allow users to join any role  
'choose (one|any)' commands can be updated after written to add / remove roles  

A channel named 'roles' or a channel with the topic: '@react4role' must be created to place the reaction message in  
Only the server owner can create a valid choose message  