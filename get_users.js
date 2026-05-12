const mongoose = require('mongoose');
const User = require('./backend/models/user-model');

mongoose.connect('mongodb+srv://manas:manas2005@nexgenclass.jndf9.mongodb.net/?retryWrites=true&w=majority&appName=NexGenClass')
  .then(async () => {
    const users = await User.find({});
    console.log(users.map(u => u._id));
    process.exit(0);
  });
