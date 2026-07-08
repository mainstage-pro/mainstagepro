const fs = require('fs');

const path = '/Users/mauriciohernandez/mainstage-pro/src/components/crm/DiscoveryForm.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Fix duplicates
content = content.replace('const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");', '');
content = content.replace('const autoSaveDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);', '');
content = content.replace('const [pasoActivo, setPasoActivo] = useState(1);', '');
content = content.replace('const [saving, setSaving] = useState(false);', '');

// Wait, the first occurences shouldn't be replaced, only the second ones!
// Actually it's better to replace the whole block
const badBlock = `  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const guardarDescubrimiento = async (esManual: boolean = false) => {
    // Already defined
  };

  const autoSaveDiscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === ESTADO ===
  const [pasoActivo, setPasoActivo] = useState(1);
  const [saving, setSaving] = useState(false);

  // Handler auto-save
  const handleAutoSave = useCallback(() => {
    setAutoSaveStatus("saving");
    guardarDescubrimiento(false);
  }, []);`;

content = content.replace(badBlock, '');

// Also ensure the end is correct
const badEnd = `
                  : <span />
              )}
            </div>
          </>
        </div>
        </div>
    </div>
  );
}`;
const goodEnd = `
                  : <span />
              )}
            </div>
    </div>
  );
}`;

content = content.replace(badEnd, goodEnd);

fs.writeFileSync(path, content);
console.log('Fixed DiscoveryForm.tsx');
