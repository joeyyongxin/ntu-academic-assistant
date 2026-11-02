// Status remains honest until a server verifies a linked ChatGPT account.
const assistantSettings=settings;
settings=function(){return assistantSettings()
 .replace('Reads your plan; its changes arrive as proposals in the Inbox','Account linking is being prepared. ChatGPT cannot access this workspace yet.')
 .replace('Demo · Not connected','Not connected')
 .replace('Preview session restoring','Reload saved workspace');};
