import assert from "node:assert/strict"
import test from "node:test"
import { nextVehicleGroupCode, vehicleGroupCodeBase } from "./catalog-code"

test("creates a stable code from Turkish vehicle group names", () => {
  assert.equal(vehicleGroupCodeBase("Elektrikli Otobüs"), "ELEKTRIKLI_OTOBUS")
})

test("adds a deterministic suffix when a company code already exists", () => {
  assert.equal(nextVehicleGroupCode("OTOBUS", ["OTOBUS", "OTOBUS_2"]), "OTOBUS_3")
})
