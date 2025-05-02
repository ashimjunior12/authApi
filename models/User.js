const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = mongoose.Schema({
 username: {type: String, required: true, unique: true},
 email: {type: String, required: true, unique: true, match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ },
 password: {type: String, required: true, unique: true, min: 6},
 isVerified: {type: Boolean, default: false},
 verificationToken: {type: String, },
 resetToken: {type: String, default: null},
 resetTokenExpiration: {type: Date}
})

userSchema.pre('save', async function(next){
 if(this.isModified('password')){
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  return next()
 }
 return next()
})

userSchema.methods.comparePassword = async function(password){
 return await bcrypt.compare(password, this.password)
}

module.exports = mongoose.model("User", userSchema)