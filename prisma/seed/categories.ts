// Reference data: the service categories. Safe to run in every environment, including production.
export const categories = [
  {
    slug: "electrician",
    name: "Electrician",
    iconKey: "Zap",
    description: "Wiring, sockets, breakers, lighting, fault finding.",
  },
  {
    slug: "plumber",
    name: "Plumber",
    iconKey: "Droplets",
    description: "Leaks, pipes, taps, tanks, water pumps, drainage.",
  },
  {
    slug: "ac-technician",
    name: "AC technician",
    iconKey: "Snowflake",
    description: "Air-conditioner installation, gas refill, servicing and repair.",
  },
  {
    slug: "generator-technician",
    name: "Generator technician",
    iconKey: "Fuel",
    description: "Petrol and diesel generator servicing and repair.",
  },
  {
    slug: "solar-inverter",
    name: "Solar and inverter technician",
    iconKey: "SunMedium",
    description: "Inverter, battery and solar panel installation and repair.",
  },
  {
    slug: "auto-mechanic",
    name: "Auto mechanic",
    iconKey: "Car",
    description: "Car diagnosis, servicing and repairs, including mobile mechanics.",
  },
  {
    slug: "carpenter",
    name: "Carpenter",
    iconKey: "Hammer",
    description: "Doors, wardrobes, roofing timber, furniture repair and fitting.",
  },
  {
    slug: "painter",
    name: "Painter",
    iconKey: "PaintRoller",
    description: "Interior and exterior painting and finishing.",
  },
  {
    slug: "tiler",
    name: "Tiler",
    iconKey: "LayoutGrid",
    description: "Floor and wall tiling, screeding and grouting.",
  },
  {
    slug: "welder",
    name: "Welder and fabricator",
    iconKey: "Flame",
    description: "Gates, burglar-proof, railings and metal fabrication.",
  },
  {
    slug: "mason",
    name: "Bricklayer and mason",
    iconKey: "BrickWall",
    description: "Block work, plastering, fencing and small construction jobs.",
  },
  {
    slug: "pop-ceiling",
    name: "POP and ceiling",
    iconKey: "PanelTop",
    description: "POP ceilings, screeding, wall finishing and interior design work.",
  },
  {
    slug: "cctv-installer",
    name: "CCTV and security installer",
    iconKey: "Cctv",
    description: "CCTV cameras, electric fences, alarms and access control.",
  },
  {
    slug: "dstv-installer",
    name: "DStv and satellite installer",
    iconKey: "Satellite",
    description: "Dish installation, realignment and decoder setup.",
  },
  {
    slug: "appliance-repair",
    name: "Appliance repair",
    iconKey: "Refrigerator",
    description: "Fridges, freezers, washing machines, microwaves and cookers.",
  },
  {
    slug: "cleaner",
    name: "Cleaning and fumigation",
    iconKey: "Sparkles",
    description: "Home and office cleaning, post-construction cleaning, fumigation.",
  },
] as const;
