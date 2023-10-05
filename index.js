const express = require('express');
const app = express();
const authRoutes = require('./routes/auth');
const bodyParser = require('body-parser');

// const PORT = process.env.PORT || 3000;
const PORT = 3000;

app.use(bodyParser.json());
app.use('/auth', authRoutes);

app.get('/ping', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'hello from demo_project'
	})
})

app.listen(PORT, () => console.log(`Server is running at port ${PORT}`));
