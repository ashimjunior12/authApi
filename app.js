const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const authRoute = require('./routes/auth')
const { swaggerUi, swaggerSpec } = require('./swagger');



const app = express();
app.use(express.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(cors())
app.use('/api/auth', authRoute)


mongoose.connect(process.env.MONGODB_URI).then(()=>console.log("Connected to mongodb")).catch((err)=>console.log(err))

module.exports = app;