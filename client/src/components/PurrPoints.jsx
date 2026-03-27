import React from 'react';
import { Trophy } from 'lucide-react';

const PurrPoints = () => {
  return (
    <div style={{
      backgroundColor: '#FFB347',
      borderRadius: '24px',
      padding: '20px',
      color: 'white',
      margin: '20px auto',
      maxWidth: '350px',
      boxShadow: '0 10px 20px rgba(255, 179, 71, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Trophy size={24} />
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Earn Purr-Points! 🎯</h3>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>Complete tasks, level up, unlock achievements</p>
        </div>
      </div>
      
      <div style={{ marginTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span>Example Progress</span>
          <span>Level 5</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '10px', marginTop: '5px' }}>
          <div style={{ width: '70%', height: '100%', background: 'white', borderRadius: '10px' }}></div>
        </div>
      </div>
    </div>
  );
};

export default PurrPoints;