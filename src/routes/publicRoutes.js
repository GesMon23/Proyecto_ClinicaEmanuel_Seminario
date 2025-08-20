import React from "react";
import { Redirect } from "react-router-dom";

import NuevoComponente from "components/NuevoComponente.js";

var publicRoutes = [
  {
    path: "/nuevo",
    name: "Nuevo",
    component: NuevoComponente,
    layout: "/"
  }
];

export default publicRoutes;
