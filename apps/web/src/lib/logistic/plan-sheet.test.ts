import assert from "node:assert/strict"
import test from "node:test"
import {
  dateOnlyInTimeZone,
  hasForecastDispatchDate,
  isForecastDispatchDateCurrentOrFuture,
  PLAN_SHEET_LINE_ALLOWED,
} from "./plan-sheet"

test("requires a forecast dispatch date before a plan sheet line can be confirmed", () => {
  assert.equal(hasForecastDispatchDate(null), false)
  assert.equal(hasForecastDispatchDate(undefined), false)
  assert.equal(hasForecastDispatchDate(""), false)
  assert.equal(hasForecastDispatchDate("2026-08-30"), true)
  assert.equal(hasForecastDispatchDate(new Date("2026-08-30")), true)
})

test("only submitted plan sheet lines can be reviewed", () => {
  assert.equal(PLAN_SHEET_LINE_ALLOWED.review("SUBMITTED"), true)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.review("CONFIRMED"), false)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.review("REJECTED"), false)
})

test("forecast dates can only be entered while submitted or revised after confirmation", () => {
  assert.equal(PLAN_SHEET_LINE_ALLOWED.setForecast("SUBMITTED"), true)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.setForecast("CONFIRMED"), true)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.setForecast("REJECTED"), false)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.reviseForecast("CONFIRMED"), true)
  assert.equal(PLAN_SHEET_LINE_ALLOWED.reviseForecast("SUBMITTED"), false)
})

test("forecast dispatch date must be today or later", () => {
  assert.equal(isForecastDispatchDateCurrentOrFuture("2026-08-29", "2026-08-30"), false)
  assert.equal(isForecastDispatchDateCurrentOrFuture("2026-08-30", "2026-08-30"), true)
  assert.equal(isForecastDispatchDateCurrentOrFuture("2026-08-31", "2026-08-30"), true)
  assert.equal(isForecastDispatchDateCurrentOrFuture("invalid", "2026-08-30"), false)
})

test("minimum forecast date follows the Istanbul business day", () => {
  assert.equal(
    dateOnlyInTimeZone(new Date("2026-08-29T21:30:00.000Z")),
    "2026-08-30",
  )
})
