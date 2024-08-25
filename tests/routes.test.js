const request = require("supertest")
const app = require("../server");
const makeQuery = require("../utils/makeQuery");

describe("species", () => {
  test('add species', async () => { 
    const res = await request(app).post("/").send({
      name: "species 1",
      files: JSON.stringify(""),
      existing_images: JSON.stringify(""),
      descriptionDelta: "",
      descriptionHTML: "",
      light_values: "",
      substrate_values: "",
      water_values: "",
    });
    expect(res.statusCode).toBe(200)
  })

  test('get specific species', async () => { 
    const res = await request(app).get("/info/1").send();
    expect(res.body).toHaveProperty("name")
  })

  test('change species', async () => { 
    const res = await request(app).patch("/1").send({
      name: "species 1 edited",
      files: JSON.stringify(""),
      existing_images: JSON.stringify(""),
      descriptionDelta: "",
      descriptionHTML: "",
      light_values: "",
      substrate_values: "",
      water_values: "",
    });
    expect(res.statusCode).toBe(200)
  })

  test('get all species', async () => { 
    const res = await request(app).get("/").send();
    expect(res.statusCode).toBe(200)
  })

  test("get species with invalid ID", async () => {
    const res = await request(app).get("/info/9999").send();
    expect(res.statusCode).toBe(404);
  });

  test("update species with invalid ID", async () => {
    const res = await request(app).patch("/9999").send({
      name: "non-existent species",
      files: JSON.stringify(""),
      existing_images: JSON.stringify(""),
      descriptionDelta: "",
      descriptionHTML: "",
      light_values: "",
      substrate_values: "",
      water_values: "",
    });
    expect(res.statusCode).toBe(404);
  });


  afterAll(async () => {
    await makeQuery("DELETE FROM species")
    await makeQuery("DELETE FROM individual_plant")
    await makeQuery("DELETE FROM species_group")

    await makeQuery("ALTER SEQUENCE species_id_seq RESTART WITH 1");
    await makeQuery("ALTER SEQUENCE individual_plant_id_seq RESTART WITH 1");
    await makeQuery("ALTER SEQUENCE species_group_id_seq RESTART WITH 1");

    console.log("All tests completed. Cleanup done.");
  });
})


