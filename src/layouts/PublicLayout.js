import React from "react";
import { Switch, Route } from "react-router-dom";
import publicRoutes from "../routes/publicRoutes";

const PublicLayout = () => {
  return (
    <Switch>
      {publicRoutes.map((prop, key) => {
        return (
          <Route
            path={prop.layout + prop.path}
            component={prop.component}
            key={key}
          />
        );
      })}
    </Switch>
  );
};

export default PublicLayout;
