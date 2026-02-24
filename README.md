# role-assignment-bot  
A JavaScript based Discord bot allowing users to assign themselves to pingable roles using reaction emotes.
### Details
- Uses the Discord.js library
- Uses a Discord channel as a living database avoiding any DB setup
- Allows the server owner to dictate one or many roles to be selectable
### Installation instructions
- Clone the repository to your local machine
- Create a .env file in the root directory to store your bot token with `TOKEN=your_token_here`
- run: 2 options to run.
- - run: 'npm install' in the bot directory
- - run: 'node bot.js' to begin the bot
- OR
- - build with docker
- - run: 'docker build -t role-assignment-bot .' in the bot directory
- - run: 'docker run --env-file .env -d --name role-assignment-bot role-assignment-bot' to begin the bot
### Usage  
*The following help command is printed using `/help`*   
```Users can join roles by reacting to a message you create. Your message must take the following format, where users can either choose 'one' role or 'any' number of roles. You can edit this message in the future and it will continue to work as expected

@react4role choose (any|one)
:one: @Role1
:two: @Role2

Role assignment messages can only be created by the server owner and will only work in teext channels named 'roles' or channels with @react4role somewhere in the channel topic. @react4role will have a role associated with it in this server's settings that needs to be placed higher than the roles you wish to allow it to manipulate```

A channel named 'roles' or a channel with the topic: '@react4role' must be created to place the reaction message in  
Only the server owner can create a valid choose message  