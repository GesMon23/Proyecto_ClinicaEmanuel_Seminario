import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from 'react-bootstrap';

const WebcamFoto = ({ onCapture, onCancel }) => {
  const webcamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');

  const videoConstraints = {
    width: 320,
    height: 240,
    facingMode: facingMode,
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (onCapture) onCapture(imageSrc);
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
  <div className="text-center p-4">
    <Webcam
      audio={false}
      ref={webcamRef}
      screenshotFormat="image/jpeg"
      videoConstraints={videoConstraints}
      className="rounded-xl border-4 border-green-800 mb-4 mx-auto"
    />

    <div className="flex justify-center gap-3 mt-3 flex-wrap">
      <button
        type="button"
        onClick={handleSwitchCamera}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow transition duration-200"
      >
        Cambiar cámara
      </button>

      <button
        type="button"
        onClick={handleCapture}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow transition duration-200"
      >
        Tomar foto
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md shadow transition duration-200"
      >
        Cancelar
      </button>
    </div>
  </div>
);

};

export default WebcamFoto;
