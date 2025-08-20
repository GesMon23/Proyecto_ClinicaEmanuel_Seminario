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
import React, { Component } from "react";
import { useLocation } from "react-router-dom";
import { Navbar, Container, Nav, Dropdown, Button } from "react-bootstrap";

// import routes from "routes.js"; // Eliminado para evitar ciclos de importación


function Header({ routes }) {
  const location = useLocation();
  const mobileSidebarToggle = (e) => {
    e.preventDefault();
    document.documentElement.classList.toggle("nav-open");
    var node = document.createElement("div");
    node.id = "bodyClick";
    node.onclick = function () {
      this.parentElement.removeChild(this);
      document.documentElement.classList.toggle("nav-open");
    };
    document.body.appendChild(node);
  };

  const getBrandText = () => {
    for (let i = 0; i < routes.length; i++) {
      if (location.pathname.indexOf(routes[i].layout + routes[i].path) !== -1) {
        return routes[i].name;
      }
    }
    return "Brand";
  };
  return (
    <Navbar style={{ backgroundColor: '#145a32' }} variant="dark" expand="lg">
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="d-flex align-items-center">
            <img src={require("assets/img/logoClinica.png")} alt="Logo Clínica Emanuel" style={{height: '100px', marginRight: '18px', border: 'none', background: '#fff', borderRadius: '4px', objectFit: 'contain', boxShadow: '0 2px 8px rgba(0,0,0,0.07)'}} />
            <span className="navbar-title-view" style={{color:'#fff', fontWeight:700, fontSize:'1.65em', letterSpacing:'0.5px'}}>{getBrandText()}</span>
            <Button
              variant="dark"
              className="d-lg-none btn-fill d-flex justify-content-center align-items-center rounded-circle p-2 ms-2"
              onClick={mobileSidebarToggle}
            >
              <i className="fas fa-ellipsis-v"></i>
            </Button>
          </div>
        </div>
        <Navbar.Toggle aria-controls="basic-navbar-nav" className="mr-2">
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
          <span className="navbar-toggler-bar burger-lines"></span>
        </Navbar.Toggle>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="nav mr-auto" navbar>

            <Nav.Item>
              <Nav.Link
                className="m-0"
                href="#pablo"
                onClick={(e) => e.preventDefault()}
              >
        
              </Nav.Link>
            </Nav.Item>
          </Nav>
          <Nav className="ml-auto" navbar style={{marginRight: '32px'}}>
            <Nav.Item>
              <Nav.Link
                className="m-0"
                href="#pablo"
                onClick={(e) => e.preventDefault()}
              >
                <span className="no-icon" style={{marginRight: '20px', color: '#fff'}}>Account</span>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                className="m-0"
                href="#logout"
                style={{
                  background:'transparent',
                  border:'none',
                  color:'#fff',
                  marginLeft:'8px',
                  fontSize:'1.7em',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  transition:'color 0.2s',
                  padding:'0',
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#fff'; }}
                onClick={(e) => e.preventDefault()}
              >
                <i className="nc-icon nc-button-power" style={{fontSize:'1em', color:'inherit', verticalAlign:'middle'}}></i>
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
