const express = require('express');
const router = express.Router();
const connection = require('../db/connection');
const path = require('path');
const authorized = require('../middleware/authorize');
const forAdmin = require('../middleware/admin');
const { body, validationResult, cookie } = require('express-validator');

//CRUD OPERATIOS
router.post('/create', forAdmin,
    body('name').isString().withMessage("please enter a valid book name"),
    body('description').isString().withMessage("please enter a valid book description"),
    (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });

            const book =
            {
                name: req.body.name,
                description: req.body.description,
                price: req.body.price,
                rack_num: req.body.rack_num,
                available: req.body.available
            }
            connection.query('insert into books set ? ', book, (err, results, fields) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ err: err });
                }
                else {
                    res.status(200)
                        .json({
                            message: "the Book created successfully"
                        });
                }
            });
        }
        catch (err) {
            console.log(err);
            res.status(500).json({ message: 'somthing went wrong' });
        }
    });

router.put('/update/:id', forAdmin,
    body('name').isString().withMessage("please enter a valid book name"),
    body('description').isString().withMessage("please enter a valid book description"),
    (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res.status(400).json({ errors: errors.array() });

            connection.query('select * from books where isbn= ?',
                req.params.id, (err, results, fields) => {
                    if (err)
                        console.log(err);
                    if (!results.length)
                        res.status(404).json({ message: "this book is not found" });
                    else {
                        const book =
                        {
                            name: req.body.name,
                            description: req.body.description,
                            price: req.body.price,
                            rack_num: req.body.rack_num,
                            available: req.body.available
                        }
                        connection.query('update books set ? where isbn = ?',
                            [book, results[0].isbn], (err, results, fields) => {
                                if (err) {
                                    console.log(err);
                                    res.status(500).json({ err: err });
                                }
                                else {
                                    res.status(200).json({ message: "book updated successfully" });
                                }
                            });
                    }
                })

        }
        catch (err) {
            console.log(err);
        }
    });

router.delete('/delete/:id', forAdmin,
    (req, res) => {
        connection.query('select * from books where isbn= ?',
            req.params.id, (err, results, fields) => {
                if (err)
                    console.log(err);
                if (!results.length)
                    res.status(404).json({ message: "this book is not found" });
                else {
                    connection.query('delete from books where isbn = ?',
                        results[0].isbn, (err, results, fields) => {
                            if (err) {
                                res.status(500).json({ err: err });
                            }
                            else {
                                res.status(200).json({ message: "book deleted successfully" });
                            }
                        });
                }
            })
    })

router.get('/getall', authorized,
    (req, res) => {
        let search = "";
        if (req.query.search) {
            search = `where name LIKE '%${req.query.search}%'`
        }
        connection.query(`select * from books ${search}`, (err, results, fields) => {
            if (err) {
                console.log(err);
                res.status(500).json({ err: err });
            }
            if (!results.length) {
                res.json({ message: "there is no books" });
            }
            else {
                res.status(200).json({ results });
            }
        })
    })

router.get('/getabook/:id', authorized,
    (req, res) => {
        connection.query('select * from books where isbn = ?', req.params.id, (err, results, fields) => {
            if (err) {
                console.log(err);
                res.status(500).json({ err: err });
            }
            if (!results.length) {
                res.json({ message: "there is no book with this isbn" });
            }
            else {
                res.status(200).json({ results });
            }
        })
    })
router.get('/filter', forAdmin,
    (req, res) => {
       
        connection.query('select * from books where isbn = ? OR rack_num = ?',
            [req.query.isbn, req.query.rack_num], (err, results, fields) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ err: err });
                }
                if (results.length == 0) {
                    res.json({ message: "no match" });
                }
                else {
                    res.json({ results });
                }
            })
    });

router.post('/borrow', authorized, (req, res) => {
    connection.query('select * from borrowed_books where user_id = ? AND book_name= ?', 
    [req.body.id,req.body.name], (err, results0, fields) => {
            if (results0.length)
                res.status(404).json({ message: "you have sent this requiste before" });
            else {
                connection.query('select * from books where name = ?',
                    req.body.name, (err, results1, fields) => {
                        if (err)
                            console.log(err);
                        if (!results1.length) {
                            res.status(404).json({ message: "this book is not found" });
                        }
                        else {
                            if (results1[0].available == 0) {
                                res.status(500).json({ message: "this book is not available" });
                            }
                            else {
                                connection.query('select * from borrowed_books where user_id=?',
                                req.body.id,(err,results2,fields)=>{
                                    if(results2.length>=5){
                                        res.json({message:"your reached the maximum number of requistes!"})
                                    }
                                    else{
                                        const dataOfBook = {
                                            book_isbn: results1[0].isbn,
                                            book_name: results1[0].name,
                                            user_id: req.body.id,
                                        }
                                        connection.query('insert borrowed_books set ?',
                                            dataOfBook, (err, results, fields) => {
                                                if (err)
                                                    console.log(err)
                                                else {
                                                    res.status(200).json({ message: "the book is wiating to be aprroved " });
                                                }
                                            })
                                    }
                                })
                                
                            }
                        }
                    })
            }
        })
});

router.patch('/updateBorrowReq', forAdmin, (req, res) => {
    connection.query('update borrowed_books set approve = ? where user_id = ? AND book_isbn = ?',
        [req.body.approve, req.body.user_id, req.body.book_isbn], (err, results0, fields) => {
            if (err)
                console.log(err);
            if (results0.affectedRows == 0) {
                res.status(404).json({ message: "the book or the user is not found" })
            }
            else {
                if (req.body.approve == false) {
                    connection.query('DELETE FROM borrowed_books WHERE user_id = ? AND book_isbn = ? ',
                        [req.body.user_id,req.body.book_isbn], (err, results1, fields) => {
                            if (err)
                                console.log(err);
                            else {
                                res.status(200).json({ message: "Rejection done" })
                            }
                        })
                }
                else {
                    connection.query('update books set available = ? where isbn = ?',
                        [0, req.body.book_isbn], (err, results, fields) => {
                            if (err)
                                console.log(err);
                            if (results.length == 0) {
                                res.status(404).json({ message: "this book.. is not found" })
                            }
                            else
                                res.json({ message: "the Approval done", results0 });
                        })
                }
            }
        })
});

router.get('/listBorrowedBooks/:id', authorized, (req, res) => {
    connection.query('SELECT * FROM borrowed_books WHERE user_id = ? AND approve = 1',
        req.params.id, (err, results, fields) => {
            if (err)
                console.log(err)
            if (!results.length)
                res.json({ message: "u didnt borrow any books yet!" });
            else
                res.json({ results });
        })
});
router.get('/search', authorized,
    (req, res) => {
        connection.query('select * from books where isbn = ? And rack_num = ?',
            [req.query.isbn, req.query.rack_num], (err, results, fields) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ err: err });
                }
                if (results.length == 0) {
                    res.json({ message: "no matching..." });
                }
                else {
                    res.json({ results });
                }
            })
    });
module.exports = router;
