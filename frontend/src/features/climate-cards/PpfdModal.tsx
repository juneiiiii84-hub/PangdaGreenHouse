import React, { useState } from 'react';
import { X, HelpCircle, ArrowRight } from 'lucide-react';
import { DEFAULT_MULTIPLIER, convertLuxToPpfd } from '../../shared/utils/ppfd';

interface PpfdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLux: number;
  onMultiplierChange: (val: number) => void;
  currentMultiplier: number;
}

export const PpfdModal: React.FC<PpfdModalProps> = ({
  isOpen,
  onClose,
  currentLux,
  onMultiplierChange,
  currentMultiplier
}) => {
  const [tempMultiplier, setTempMultiplier] = useState<string>(currentMultiplier.toString());

  if (!isOpen) return null;

  const handleSave = () => {
    const val = parseFloat(tempMultiplier);
    if (!isNaN(val) && val > 0) {
      onMultiplierChange(val);
      onClose();
    } else {
      alert("กรุณากรอกตัวเลขทศนิยมที่มากกว่า 0");
    }
  };

  const calculatedPpfd = convertLuxToPpfd(currentLux, currentMultiplier);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-start">
          <div className="flex gap-2.5 items-center">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <HelpCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">รายละเอียดสูตรและการแปลงค่าแสง</h3>
              <p className="text-[10px] text-slate-400">สูตรคำนวณจากค่า LUX เป็นค่าความเข้มแสงพืช PPFD</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
          <div className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">สูตรการคำนวณ</div>
          <div className="text-xs font-black text-slate-800 font-mono">
            PPFD (μmol/m²/s) = LUX × Multiplier (ตัวคูณแหล่งแสง)
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            เนื่องจากพืชสังเคราะห์แสงผ่านแถบพลังงานโฟตอน (Photosynthetically Active Radiation) จึงจำต้องคูณด้วยตัวแปรสภาพแสงธรรมชาติ ซึ่งค่ามาตรฐานแสงอาทิตย์คือ <span className="font-bold text-slate-700">0.0185</span>
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-2xl space-y-3">
          <div className="text-[10px] font-extrabold tracking-widest text-amber-600 uppercase">การคำนวณ ณ ขณะนี้</div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">ความสว่างแสงดิบ:</span>
            <span className="text-slate-800 font-black">{currentLux.toLocaleString()} LUX</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-bold">ตัวคูณแสงปัจจุบัน:</span>
            <span className="text-slate-800 font-black">× {currentMultiplier}</span>
          </div>
          <div className="h-px bg-amber-200/50"></div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-amber-700 font-extrabold">ผลลัพธ์ความเข้มแสงพืช:</span>
            <span className="text-amber-700 font-black text-sm">{calculatedPpfd.toLocaleString()} μmol/m²/s</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-extrabold tracking-widest text-slate-400 block">ปรับเปลี่ยนตัวคูณแหล่งแสง (Multiplier):</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              value={tempMultiplier}
              onChange={(e) => setTempMultiplier(e.target.value)}
              className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 font-mono"
              placeholder="เช่น 0.0185"
            />
            <button
              onClick={() => setTempMultiplier(DEFAULT_MULTIPLIER.toString())}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              รีเซ็ต
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 cursor-pointer"
        >
          <span>ตกลงบันทึกตัวคูณ</span>
          <ArrowRight size={12} />
        </button>

      </div>
    </div>
  );
};
