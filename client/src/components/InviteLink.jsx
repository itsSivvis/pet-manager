import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { useTranslation } from 'react-i18next';

const inviteLink = (code) =>
  `${window.location.origin}/register?invite=${encodeURIComponent(code)}`;

/** Copyable invite link; used here and in the administration. */
export default function InviteLink({ code, label }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const link = inviteLink(code);
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={link}
      slotProps={{
        htmlInput: { readOnly: true, onFocus: (e) => e.target.select() },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={copied ? t('household.invite.copied') : t('household.invite.copy')}>
                <IconButton
                  edge="end"
                  aria-label={t('household.invite.copy')}
                  onClick={async () => {
                    await navigator.clipboard?.writeText(link);
                    setCopied(true);
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
