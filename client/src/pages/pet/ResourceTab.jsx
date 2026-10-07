import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useTranslation } from 'react-i18next';
import { usePetResource } from '../../api/hooks.js';
import QueryState from '../../components/QueryState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import FormDialog from '../../components/FormDialog.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

/**
 * List + CRUD for one pet sub-resource. `renderItem(item, resource)` renders
 * the card body; edit/delete buttons are added automatically.
 */
export default function ResourceTab({
  petId,
  resource,
  title,
  addLabel,
  fields,
  renderItem,
  renderAbove,
  emptyEmoji,
  emptyText,
  itemActions,
  initialValues = {},
}) {
  const { t } = useTranslation();
  const res = usePetResource(petId, resource);
  // null | { values } for a new record | an existing record
  const [editing, setEditing] = useState(null);
  const isNew = editing && !editing.id;
  // initialValues may be a function so that time-dependent defaults
  // (e.g. "tomorrow") are computed when the dialog opens, not while rendering.
  const openNew = () =>
    setEditing({ values: typeof initialValues === 'function' ? initialValues() : initialValues });
  const [deleting, setDeleting] = useState(null);

  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
          {title}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          {addLabel}
        </Button>
      </Stack>
      <QueryState query={res.list}>
        {(items) => (
          <>
            {renderAbove?.(items)}
            {items.length === 0 ? (
              <Card>
                <EmptyState compact emoji={emptyEmoji} description={emptyText} />
              </Card>
            ) : (
              <Stack spacing={1.5}>
                {items.map((item, i) => (
                  <Card key={item.id} sx={{ animationDelay: `${i * 40}ms` }}>
                    <CardContent
                      sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'flex-start',
                        '&:last-child': { pb: 2 },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>{renderItem(item, res)}</Box>
                      <Stack direction="row" sx={{ flexShrink: 0 }}>
                        {itemActions?.(item, res)}
                        <Tooltip title={t('common.edit')}>
                          <IconButton
                            onClick={() => setEditing(item)}
                            aria-label={t('common.edit')}
                            size="small"
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.delete')}>
                          <IconButton
                            onClick={() => setDeleting(item)}
                            aria-label={t('common.delete')}
                            size="small"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}
      </QueryState>
      {editing && (
        <FormDialog
          open
          title={isNew ? addLabel : t('common.edit')}
          fields={fields}
          initialValues={isNew ? editing.values : editing}
          onClose={() => setEditing(null)}
          onSubmit={(values) =>
            isNew
              ? res.create.mutateAsync(values)
              : res.update.mutateAsync({ id: editing.id, ...values })
          }
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('common.confirmDeleteTitle')}
        message={t('common.confirmDeleteText')}
        onClose={() => setDeleting(null)}
        onConfirm={() => res.remove.mutateAsync(deleting.id)}
      />
    </Box>
  );
}
