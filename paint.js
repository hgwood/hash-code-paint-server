"use strict"

const express = require("express")
const bodyParser = require("body-parser")
const app = express()
app.use(bodyParser.json())
const _ = require("lodash")
const fs = require("fs")

const logo = fs.readFileSync("logo.in.txt", "utf8")

const logoModel = _(logo.split("\n")).drop(1).take(14).map(function (line, iline) {
  // console.log("line", line)
  return _.map(line, function (char, ichar) {
    // if (char === "#") console.log(`{"command":"PAINT","x":${ichar},"y":${iline}},`)
    return char === "#"
  })
}).value()


// console.log(logoModel.length, logoModel[0].length)

app.get("/", function (req, res) {
  res.json({
    goal: "paint the black and white image with the minimum number of commands",
    links: {
      picture: {
        what: "the black and white image as a string",
        href: "/picture",
        method: "GET"
      },
      model: {
        what: "the black and white image as a matrix of booleans",
        href: "/model",
        method: "GET"
      },
      solution: {
        what: "post a solution",
        href: "/",
        method: "POST"
      }
    }
  })
})

app.get("/model", function (req, res) {
  res.send(logoModel).end()
})

app.get("/picture", function (req, res) {
  res.send(logo).end()
})

app.post("/", function (req, res) {

  if (!_.get(req, "body.solution")) return res.status(400).send({message: "missing field solution (should be an array)"}).end()
  if (!_.get(req, "body.name")) return res.status(400).send({message: "missing field name (should be string)"}).end()

  const player = req.body.name

  console.log("request from", player)

  const canvas = _.times(14, () => Array(80).fill(false))

  _(req.body.solution).each(function (command, index) {
    if (command.command === "PAINT_LINE") {
      if (!_.isNumber(command.x1) || !_.inRange(command.x1, 80)) return res.status(400).send({message: "invalid x1 at command " + index}).end()
      if (!_.isNumber(command.y1) || !_.inRange(command.y1, 14)) return res.status(400).send({message: "invalid y1 at command " + index}).end()
      if (!_.isNumber(command.x2) || !_.inRange(command.x2, 80)) return res.status(400).send({message: "invalid x2 at command " + index}).end()
      if (!_.isNumber(command.y2) || !_.inRange(command.y2, 14)) return res.status(400).send({message: "invalid y2 at command " + index}).end()
      if (command.x1 === command.x2) {
        const y1 = Math.min(command.y1, command.y2)
        const y2 = Math.max(command.y1, command.y2)
        _.each(_.range(y1, y2 + 1), function (n, i) {
          canvas[n][command.x1] = true
        })
      } else if (command.y1 === command.y2) {
        const x1 = Math.min(command.x1, command.x2)
        const x2 = Math.max(command.x1, command.x2)
        _.each(_.range(x1, x2 + 1), function (n, i) {
          canvas[command.y1][n] = true
        })
      } else {
        const message = "invalid PAINT LINE: line not vetical nor horizontal: " + JSON.stringify(command)
        console.log(player, ":", message)
        return res.status(400).send({message: message}).end()
      }
    } else if (command.command === "ERASE") {
      if (!_.isNumber(command.x) || !_.inRange(command.x, 80)) return res.status(400).send({message: "invalid x at command " + index}).end()
      if (!_.isNumber(command.y) || !_.inRange(command.y, 14)) return res.status(400).send({message: "invalid y at command " + index}).end()
      // console.log("PAINT", command.x, command.y)
      // console.log("CANVAS", canvas[0][0])
      canvas[command.y][command.x] = false
    } else if (command.command === "PAINT") {
      if (!_.isNumber(command.x) || !_.inRange(command.x, 80)) return res.status(400).send({message: "invalid x at command " + index}).end()
      if (!_.isNumber(command.y) || !_.inRange(command.y, 14)) return res.status(400).send({message: "invalid y at command " + index}).end()
      // console.log("PAINT", command.x, command.y)
      // console.log("CANVAS", canvas[0][0])
      canvas[command.y][command.x] = true
      // console.log("CANVAS AFTER", canvas[0][0])
    } else {
      const message = `invalid command '${command.command}' at index ${index}`
      console.log(player, ":", message)
      return res.status(400).send({message: message}).end()
    }
  })

  function same(expected, actual) {
    const errors = []
    _.each(expected, function (line, y) {
      _.each(line, function (cell, x) {
        if (cell !== actual[y][x]) errors.push(`cell ${x}, ${y}: expected ${cell} but was ${actual[y][x]}`)
      })
    })
    return errors
  }

  // console.log(canvas[0].join(","))
  // console.log(logoModel[0].join(","))
  const errors = same(logoModel, canvas)
  if (errors.length === 0) {
    console.log(req.body.name, ":", "OK in", req.body.solution.length, "commands")
    res.status(200).send({score: req.body.solution.length, message: "Congrats! A lower score is better. Can you beat your own record?"}).end()
  } else {
    const message =  "picture is not right"
    console.log(player, ":", message)
    res.status(400).send({message: message, errors: errors}).end()
  }
})

app.listen(8080)