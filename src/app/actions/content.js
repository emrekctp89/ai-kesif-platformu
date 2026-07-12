'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@/utils/slugify';
import { uploadToGCS } from '@/utils/gcs';

export async function createPost(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const title = formData.get('title');
  const type = formData.get('type');

  if (!title || !type) {
    return { error: 'Yazı başlığı ve tipi zorunludur.' };
  }

  const slug = slugify(title) + '-' + Date.now().toString(36);

  const { data: newPost, error } = await supabase
    .from('posts')
    .insert({
      title,
      slug,
      author_id: user.id,
      content: `# ${title}\n\nBuraya yazınızı yazmaya başlayın...`,
      type,
      status: 'Taslak',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Yazı oluşturma hatası:', error);
    return { error: 'Yazı oluşturulurken bir hata oluştu.' };
  }

  redirect(`/admin/posts/${newPost.id}/edit`);
}

export async function updatePost(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const id = formData.get('id');

  const { data: existingPost } = await supabase
    .from('posts')
    .select('published_at')
    .eq('id', id)
    .single();

  const postData = {
    title: formData.get('title'),
    slug: formData.get('slug'),
    content: formData.get('content'),
    description: formData.get('description'),
    featured_image_url: formData.get('featured_image_url'),
    status: formData.get('status'),
    type: formData.get('type'),
    category_id: formData.get('category_id') ? parseInt(formData.get('category_id'), 10) : null,
    updated_at: new Date().toISOString(),
  };

  if (postData.status === 'Yayınlandı' && !existingPost?.published_at) {
    postData.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from('posts').update(postData).eq('id', id);

  if (error) {
    console.error('Yazı güncelleme hatası:', error);
    return { error: `Veritabanı Hatası: ${error.message}` };
  }

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${postData.slug}`);

  return { success: 'Yazı başarıyla güncellendi.' };
}

export async function deletePost(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const id = formData.get('id');
  const slug = formData.get('slug');

  if (!id) {
    return { error: "Yazı ID'si bulunamadı." };
  }

  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) {
    console.error('Yazı silme hatası:', error);
    return { error: 'Yazı silinirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/blog');
  revalidatePath(`/blog/${slug}`);

  return { success: 'Yazı başarıyla silindi.' };
}

export async function assignTagsToPost(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return { error: 'Yetkiniz yok.' };

  const supabaseAdmin = createAdminClient();
  const postId = formData.get('postId');
  const tagIds = formData.getAll('tagId').map((id) => parseInt(id, 10));

  if (!postId) return { error: "Yazı ID'si bulunamadı." };

  await supabaseAdmin.from('post_tags').delete().eq('post_id', postId);

  if (tagIds.length > 0) {
    const newLinks = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));
    const { error } = await supabaseAdmin.from('post_tags').insert(newLinks);
    if (error) return { error: 'Yazı etiketleri güncellenirken bir hata oluştu.' };
  }

  revalidatePath(`/admin/posts/${postId}/edit`);
  return { success: 'Yazının etiketleri başarıyla güncellendi.' };
}

export async function togglePostPublish(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const postId = formData.get('postId');
  const newStatus = formData.get('isPublished') === 'true' ? 'Yayınlandı' : 'Taslak';

  const postData = {
    status: newStatus,
  };

  if (newStatus === 'Yayınlandı') {
    postData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('posts')
    .update(postData)
    .eq('id', postId)
    .select('slug')
    .single();

  if (error) {
    console.error('Yayın durumu güncelleme hatası:', error);
    return { error: 'Durum güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/admin');
  revalidatePath('/blog');

  return { success: `Yazının durumu "${newStatus}" olarak güncellendi.` };
}

export async function createCollection(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Bu işlem için giriş yapmalısınız.' };

  const title = formData.get('title');
  if (!title) return { error: 'Koleksiyon başlığı boş olamaz.' };

  const slug = slugify(title) + '-' + Date.now().toString(36);

  const { data: newCollection, error } = await supabase
    .from('collections')
    .insert({ title, slug, user_id: user.id, description: '' })
    .select('id')
    .single();

  if (error) {
    console.error('Koleksiyon oluşturma hatası:', error);
    return { error: 'Koleksiyon oluşturulurken bir hata oluştu.' };
  }

  redirect(`/profile/collections/${newCollection.id}/edit`);
}

export async function updateCollection(formData) {
  'use server';
  const supabase = await createClient();

  const id = formData.get('id');
  const title = formData.get('title');
  const description = formData.get('description');
  const is_public = formData.get('is_public') === 'true';
  const type = formData.get('type');

  const { error } = await supabase
    .from('collections')
    .update({
      title,
      description,
      is_public,
      type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Koleksiyon güncelleme hatası:', error);
    return { error: 'Koleksiyon güncellenirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  revalidatePath(`/collections/${formData.get('slug')}`);
  return { success: 'Koleksiyon başarıyla güncellendi.' };
}

export async function deleteCollection(formData) {
  'use server';
  const supabase = await createClient();
  const id = formData.get('id');

  const { error } = await supabase.from('collections').delete().eq('id', id);

  if (error) {
    console.error('Koleksiyon silme hatası:', error);
    return { error: 'Koleksiyon silinirken bir hata oluştu.' };
  }

  revalidatePath('/profile');
  return { success: 'Koleksiyon başarıyla silindi.' };
}

export async function updateCollectionTools(formData) {
  'use server';
  const supabase = await createClient();

  const collectionId = formData.get('collectionId');
  const toolData = JSON.parse(formData.get('tools'));

  const { error: deleteError } = await supabase
    .from('collection_tools')
    .delete()
    .eq('collection_id', collectionId);

  if (deleteError) {
    console.error('Eski koleksiyon araçlarını silme hatası:', deleteError);
    return { error: 'Koleksiyondaki araçlar güncellenirken bir hata oluştu.' };
  }

  if (toolData.length > 0) {
    const newLinks = toolData.map((item) => ({
      collection_id: collectionId,
      tool_id: item.tool_id,
      notes: item.notes,
    }));

    const { error: insertError } = await supabase.from('collection_tools').insert(newLinks);

    if (insertError) {
      console.error('Yeni koleksiyon araçlarını ekleme hatası:', insertError);
      return {
        error: 'Koleksiyondaki araçlar güncellenirken bir hata oluştu.',
      };
    }
  }

  revalidatePath(`/profile/collections/${collectionId}/edit`);
  revalidatePath(`/collections/${formData.get('slug')}`);
  return { success: 'Koleksiyondaki araçlar güncellendi.' };
}

export async function uploadBlogImage(formData) {
  'use server';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: 'Yetkiniz yok.' };
  }

  const file = formData.get('image');
  if (!file || file.size === 0) {
    return { error: 'Lütfen bir dosya seçin.' };
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `public/${user.id}/${Date.now()}.${fileExt}`;
  const gcsPath = `blog-images/${filePath}`;

  let publicUrl;
  try {
    publicUrl = await uploadToGCS(gcsPath, file, file.type || 'image/jpeg');
  } catch (uploadError) {
    console.error('Blog görseli yükleme hatası (GCS):', uploadError);
    return { error: 'Görsel yüklenirken bir hata oluştu.' };
  }

  return { success: true, url: publicUrl };
}

export async function assignToolsToPost(formData) {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) return { error: 'Yetkiniz yok.' };

  const supabaseAdmin = createAdminClient();
  const postId = formData.get('postId');
  const toolIds = formData.getAll('toolId').map((id) => parseInt(id, 10));

  if (!postId) return { error: "Yazı ID'si bulunamadı." };

  await supabaseAdmin.from('post_tools').delete().eq('post_id', postId);

  if (toolIds.length > 0) {
    const newLinks = toolIds.map((toolId) => ({
      post_id: postId,
      tool_id: toolId,
    }));
    const { error } = await supabaseAdmin.from('post_tools').insert(newLinks);
    if (error) return { error: 'İlişkili araçlar güncellenirken bir hata oluştu.' };
  }

  revalidatePath(`/admin/posts/${postId}/edit`);
  return { success: 'Yazının ilişkili araçları güncellendi.' };
}
