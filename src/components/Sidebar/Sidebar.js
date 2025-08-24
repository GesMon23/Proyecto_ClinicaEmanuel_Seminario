/*!

=========================================================
* Light Bootstrap Dashboard React - v2.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/light-bootstrap-dashboard-react
* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React, { useState } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import { Nav } from "react-bootstrap";
import logo from "assets/img/reactlogo.png";
import "./Sidebar.css";
import { useAuth } from "@/contexts/auth-context";

function Sidebar({ color, image, routes, collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth() || {};
  const activeRoute = (routeName) => {
    return location.pathname.indexOf(routeName) > -1 ? "active" : "";
  };

  return (
    <div className={`sidebar${collapsed ? " collapsed" : ""}`} data-color={color}>
      <div className="sidebar-toggle-btn-container">
        <button className="sidebar-toggle-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <i className="fas fa-chevron-right" /> : <i className="fas fa-chevron-left" />}
        </button>
        <div className="sidebar-divider"></div>
      </div>
      <div className="sidebar-wrapper">
        <Nav>
          {routes.map((prop, key) => {
            if (!prop.redirect)
              return (
                <li
                  className={
                    prop.upgrade
                      ? "active active-pro"
                      : activeRoute(prop.layout + prop.path)
                  }
                  key={key}
                >
                  {prop.name === "Llamado Pacientes" ? (
  <a
    href={prop.layout + prop.path}
    className="nav-link"
    target="_blank"
    rel="noopener noreferrer"
    style={{ textDecoration: 'none' }}
  >
    <i className={prop.icon} />
    <p>{prop.name}</p>
  </a>
) : (
  <NavLink
    to={prop.layout + prop.path}
    className="nav-link"
    activeClassName="active"
  >
    <i className={prop.icon} />
    <p>{prop.name}</p>
  </NavLink>
)}
                </li>
              );
            return null;
          })}
        </Nav>
      </div>
      <div style={{position: 'absolute', bottom: 0, width: '100%', padding: collapsed ? '16px 0' : '24px 0', display: 'flex', justifyContent: 'center', background: 'transparent'}}>
        <button
          className="sidebar-logout-btn"
          title="Cerrar sesión"
          onClick={() => {
            if (typeof logout === 'function') logout();
            navigate('/');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '1.6em',
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? '0' : '10px',
            cursor: 'pointer',
            width: collapsed ? '40px' : '80%',
            justifyContent: 'center',
            padding: '8px 0',
            borderRadius: '8px',
            transition: 'background 0.2s',
          }}
        >
          <i className="nc-icon nc-button-power" />
          {!collapsed && <span className="sidebar-logout-text">Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
