const User = require('../models/User');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto')


const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth:{
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS
 }
})

exports.Signup = async(req,res,)=>{
 const {username,email,password} = req.body;
 if(!username || !email || !password){
  return res.status(400).json({message:"All fields are required"})
 }
 // check existing user
 try {
  const existingUser = await User.findOne({email})
  if(existingUser){
   return res.status(400).json({message:"User already exists"})
  }
  const user = new User({username,email,password});
  await user.save()

  const payload = {id: user._id, username: user.username}
  const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:'1h'})
  const verificationUrl = `http://localhost:${process.env.PORT}/api/auth/verify-email/${token}`;

  await transporter.sendMail({
   from : process.env.EMAIL_USER,
   to: email,
   subject: `Verify your email`,
   html:`Please click this <a href=${verificationUrl}>link</a> to verify your email address`

  })

  return res.status(201).json({message:"User created, please check your email for verification code"})

 } catch (error) {
  console.log(error)
  return res.status(500).json({message:"Internal Server Error"})
 }
}

exports.verifyEmail = async(req,res) =>{
 const {token} = req.params;
 try {
  if(!token){
   return res.status(400).json({message:"Token is not provided"})
  }
  const decoded =  jwt.verify(token, process.env.JWT_SECRET)
  const user = await User.findById(decoded.id);
  if(!user){
   return res.status(400).json({message:"User not found"})
  }
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();
  res.status(200).json({message:"Email verified, you can now log in!"})
 } catch (error) {
  console.log(error)
 }
}

exports.Login = async(req,res) =>{
 const {email,password} = req.body;

 // check whether the user exists or not
 const user = await User.findOne({email})
 if(!user){
  return res.status(400).json({message:"Invalid Credential"})
 }

 if(!user.isVerified){
  return res.status(403).json({message:"You are not verified. Please check your email."})

 }

 const isMatch = await user.comparePassword(password)
 if(!isMatch){
  return res.status(400).json({message:"Invalid Credential"})
 }

 const payload = {id: user._id, username: user.username}
 const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:'1h'})

 return res.status(200).json({message:"Login was successful", token});

 
}

exports.ForgotPassword = async(req,res) =>{
 const {email} = req.body;

 try {
   // check if user exists or not
   const user = await User.findOne({ email });
   if (!user) {
     return res.status(400).json({ message: 'User not found!' });
   }

   const resetToken = crypto.randomBytes(32).toString('hex');
   const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

   user.resetToken = hashedToken;
   user.resetTokenExpiration = Date.now() + 15 * 60 *1000;
   
   await user.save();
   const resetLink = `http://localhost:${process.env.PORT}/api/auth/reset-password/${resetToken}`

   await transporter.sendMail({
     from: process.env.EMAIL_USER,
     to: email,
     subject: `Reset your password`,
     html: `Please click this <a href=${resetLink}>link</a> to reset your password.`,
   });

   res.status(200).json({ message: 'Password reset link was sent' });
 } catch (error) {
  console.log(error)
  return res.status(500).json({message: error})
 }
}

exports.ResetPassword = async(req,res) =>{

 const {password} = req.body;
 const {token} = req.params;
 const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

 try {
  // find user by hashed token and valid expiry
  const user = await User.findOne({
   resetToken: hashedToken,
   resetTokenExpiration: {$gt: Date.now()}
  })

  if(!user){
   return res.status(400).json({message:"Invalid or expired token"})
  }

  // set new password
  user.password = password;


  // clear reset token and expiry
  user.resetToken = undefined;
  user.resetTokenExpiration = undefined;

  await user.save()
  return res.status(200).json({message:"Password has been reset successfully"})


 } catch (error) {
  console.log(error)
  return res.status(500).json({message: error})
 }

}