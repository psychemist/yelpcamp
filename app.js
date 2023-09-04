import ejsMate from 'ejs-mate'
import express from 'express'
import { fileURLToPath } from 'url'
import methodOverride from 'method-override'
import mongoose from 'mongoose'
import path from 'path'

import AppError from './utils/AppError.js'
import Campground from './models/campground.js'
import { campgroundSchema, reviewSchema } from './schemas/schema.js'
import catchAsync from './utils/catchAsync.js'
import Review from './models/review.js'
import campground from './models/campground.js'

mongoose.connect('mongodb://localhost:27017/yelpCamp')

const db = mongoose.connection
db.on('error', console.error.bind(console, 'CONECTION ERROR'))
db.once('open', () => { console.log('DATABASE CONNECTED') })

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))

const validateCampground = (req, res, next) => {
	const { error } = campgroundSchema.validate(req.body)
	if (error) {
		const msg = error.details.map(el => el.message).join(',')
		throw new AppError(400, msg)
	} else {
		next()
	}
}

const validateReview = (req, res, next) => {
	const { error } = reviewSchema.validate(req.body)
	if (error) {
		const msg = error.details.map(el => el.message).join(',')
		throw new AppError(400, msg)
	} else {
		next()
	}
}

app.get('/', (req, res) => {
	res.render('home')
})

app.get('/campgrounds', catchAsync(async (req, res) => {
	const campgrounds = await Campground.find({})
	res.render('campgrounds/index', { campgrounds })
}))

app.get('/campgrounds/new', (req, res) => {
	res.render('campgrounds/new')
})

app.post('/campgrounds', validateCampground, catchAsync(async (req, res, next) => {
	const campground = new Campground(req.body.campground)
	await campground.save()
	res.redirect(`/campgrounds/${campground._id}`)
}))

app.get('/campgrounds/:id', catchAsync(async (req, res) => {
	const campground = await Campground.findById(req.params.id).populate('reviews')
	res.render('campgrounds/show', { campground })
}))

app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
	const campground = await Campground.findById(req.params.id)
	res.render('campgrounds/edit', { campground })
}))

app.put('/campgrounds/:id', validateCampground, catchAsync(async (req, res) => {
	const campground = await Campground.findByIdAndUpdate(req.params.id, { ...req.body.campground })
	res.redirect(`/campgrounds/${campground._id}`)
}))

app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
	await Campground.findByIdAndDelete(req.params.id)
	res.redirect('/campgrounds')
}))

app.post('/campgrounds/:id/reviews', validateReview, catchAsync(async (req, res) => {
	const { id } = req.params
	const campground = await Campground.findById(id)
	const review = new Review(req.body.review)
	review.camp = campground._id
	campground.reviews.push(review)
	await review.save()
	await campground.save()
	res.redirect(`/campgrounds/${id}`)
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
	const { id, reviewId } = req.params
	await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } })
	await Review.findByIdAndDelete(reviewId)
	res.redirect(`/campgrounds/${id}`)
}))

app.all('*', (req, res, next) => {
	next(new AppError(404, 'PAGE NOT FOUND'))
})

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err
	if (!err.message) err.message = 'SOMETHING WENT WRONG'
	res.status(statusCode).render('error', { err })
})

app.listen(3000, () => {
	console.log('SERVING ON PORT 3000')
})