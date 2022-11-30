const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json())


const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z9zwita.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const cetagotieCullection = client.db('resaleJone').collection('cetagories')
        const allProductCullection = client.db('resaleJone').collection('allProducts')
        const bookingsCullection = client.db('resaleJone').collection('bookings')
        const usersCullection = client.db('resaleJone').collection('users')
        // const addCullection = client.db('resaleJone').collection('addProducts')
        const paymentsCullection = client.db('resaleJone').collection('payments')

        app.get('/allCetagories', async (req, res) => {
            const query = {}
            const result = await cetagotieCullection.find(query).toArray()
            res.send(result)
        })

        app.get('/allProductsMy', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email }
            const result = await allProductCullection.find(query).toArray()
            res.send(result)
        })

        app.get('/allProducts', async (req, res) => {
            let query = {}
            if (req.query.advertised) {
                query = {
                    advertised: req.query.advertised
                }
            };
            const cursor = allProductCullection.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/allProducts/:name', async (req, res) => {
            const query = req.params.name;
            const filter = {
                brand: query
            }
            const result = await allProductCullection.find(filter).toArray()
            res.send(result)
        })

        app.post('/allProducts', async (req, res) => {
            const products = req.body;
            const result = await allProductCullection.insertOne(products);
            res.send(result);
        })

        app.put('/allProducts/advertised/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    advertised: 'advertised'
                }
            }
            const result = await allProductCullection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.delete('/allProducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await allProductCullection.deleteOne(filter)
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await bookingsCullection.find(query).toArray()
            res.send(result)
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await bookingsCullection.findOne(filter)
            res.send(result)
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCullection.insertOne(booking)
            res.send(result)
        })

        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const resale_price = booking.resale_price;
            const amount = resale_price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                'payment_method_types': [
                    'card'
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.get('/users', async (req, res) => {
            let query = {}
            if (req.query.role) {
                query = {
                    role: req.query.role
                }
            };
            const cursor = usersCullection.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {}
            const result = await usersCullection.find(query).toArray()
            res.send(result)
        })


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCullection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCullection.findOne(query);
            res.send({ isSeller: user?.role === 'Sellar' })
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const exist = await usersCullection.findOne({ user: user.email });
            if (exist) {
                return res.send({ status: 0, message: 'user already exist' })
            }
            const result = await usersCullection.insertOne(user)
            res.send(result)
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCullection.deleteOne(filter)
            res.send(result)
        })



        app.put('/users/verify/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    cheak: 'verify'
                }
            }
            const result = await usersCullection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // app.get('/addProducts', async (req, res) => {
        //     const query = {}
        //     const result = await addCullection.find(query).toArray()
        //     res.send(result)
        // })

        // app.post('/addProducts', async (req, res) => {
        //     const addProduct = req.body;
        //     const result = await addCullection.insertOne(addProduct)
        //     res.send(result)
        // })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCullection.insertOne(payment)
            const id = payment.booking
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transationId: payment.transationId
                }
            }
            const updatedResult = await bookingsCullection.updateOne(filter, updatedDoc)
            res.send(result)
        })

    }
    finally {

    }
}
run().catch(err => console.error(err))




app.get('/', (req, res) => {
    res.send('resale jone servar is running')
})

app.listen(port, (req, res) => {
    console.log(`resale jone is running ${port}`)
})